"""POWER-ProtoPNet inference model (ConvNeXt-Tiny + SE + SRM)."""

from __future__ import annotations

import torch
import torch.nn as nn
import torch.nn.functional as F

from config import (
    NUM_CLASSES,
    NUM_PROTOTYPES,
    PROTOTYPE_DIM,
    PROTOTYPES_PER_CLASS,
    SE_REDUCTION,
)


class LayerNorm2d(nn.Module):
    def __init__(self, num_channels: int, eps: float = 1e-6):
        super().__init__()
        self.weight = nn.Parameter(torch.ones(num_channels))
        self.bias = nn.Parameter(torch.zeros(num_channels))
        self.eps = eps

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        u = x.mean(1, keepdim=True)
        s = (x - u).pow(2).mean(1, keepdim=True)
        x = (x - u) / torch.sqrt(s + self.eps)
        return self.weight[:, None, None] * x + self.bias[:, None, None]


class ConvNeXtMLP(nn.Module):
    def __init__(self, dim: int, mlp_ratio: int = 4):
        super().__init__()
        hidden = dim * mlp_ratio
        self.fc1 = nn.Linear(dim, hidden)
        self.fc2 = nn.Linear(hidden, dim)

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        return self.fc2(F.gelu(self.fc1(x)))


class ConvNeXtBlock(nn.Module):
    def __init__(self, dim: int, mlp_ratio: int = 4):
        super().__init__()
        self.norm = LayerNorm2d(dim)
        self.conv_dw = nn.Conv2d(dim, dim, 7, padding=3, groups=dim)
        self.gamma = nn.Parameter(1e-6 * torch.ones(dim))
        self.mlp = ConvNeXtMLP(dim, mlp_ratio)

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        shortcut = x
        x = self.conv_dw(self.norm(x))
        x = x.permute(0, 2, 3, 1)
        x = self.mlp(x)
        x = x.permute(0, 3, 1, 2)
        return shortcut + self.gamma.view(1, -1, 1, 1) * x


class ConvNeXtStage(nn.Module):
    def __init__(self, in_ch: int, out_ch: int, depth: int, downsample: bool = True):
        super().__init__()
        if downsample:
            self.downsample = nn.Sequential(
                LayerNorm2d(in_ch),
                nn.Conv2d(in_ch, out_ch, 2, stride=2),
            )
            block_dim = out_ch
        else:
            self.downsample = nn.Identity()
            block_dim = in_ch

        self.blocks = nn.Sequential(*[ConvNeXtBlock(block_dim) for _ in range(depth)])

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        return self.blocks(self.downsample(x))


class ConvNeXtTinyBackbone(nn.Module):
    depths = (3, 3, 9, 3)
    dims = (96, 192, 384, 768)

    def __init__(self):
        super().__init__()
        self.stem = nn.Sequential(
            nn.Conv2d(3, self.dims[0], 4, stride=4),
            LayerNorm2d(self.dims[0]),
        )
        stages = []
        in_ch = self.dims[0]
        for i, (depth, out_ch) in enumerate(zip(self.depths, self.dims)):
            stages.append(
                ConvNeXtStage(in_ch, out_ch, depth, downsample=i > 0)
            )
            in_ch = out_ch
        self.stages = nn.ModuleList(stages)

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        x = self.stem(x)
        for stage in self.stages:
            x = stage(x)
        return x


class SEBlock(nn.Module):
    def __init__(self, channels: int, reduction: int = SE_REDUCTION):
        super().__init__()
        hidden = channels // reduction
        self.fc = nn.Sequential(
            nn.Linear(channels, hidden, bias=False),
            nn.ReLU(inplace=True),
            nn.Linear(hidden, channels, bias=False),
            nn.Sigmoid(),
        )

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        b, c, _, _ = x.shape
        scale = self.fc(F.adaptive_avg_pool2d(x, 1).view(b, c)).view(b, c, 1, 1)
        return x * scale


class SRM(nn.Module):
    """Spatial relation / projection head (768 -> 256)."""

    def __init__(self, in_ch: int = 768, out_ch: int = PROTOTYPE_DIM):
        super().__init__()
        self.block = nn.Sequential(
            nn.Conv2d(in_ch, in_ch, 3, padding=1, groups=in_ch, bias=False),
            nn.BatchNorm2d(in_ch),
            nn.ReLU(inplace=True),
            nn.Conv2d(in_ch, out_ch, 1, bias=False),
            nn.BatchNorm2d(out_ch),
        )

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        return self.block(x)


class PrototypeLayer(nn.Module):
    def __init__(
        self,
        num_prototypes: int = NUM_PROTOTYPES,
        dim: int = PROTOTYPE_DIM,
    ):
        super().__init__()
        self.vectors = nn.Parameter(torch.randn(num_prototypes, dim))

    def forward(self, x: torch.Tensor) -> tuple[torch.Tensor, torch.Tensor]:
        b, d, h, w = x.shape
        patches = F.normalize(x.view(b, d, -1), dim=1)
        protos = F.normalize(self.vectors, dim=1)
        cos = torch.einsum("bds,pd->bps", patches, protos)
        sim = cos.max(dim=2).values
        act_maps = cos.view(b, -1, h, w)
        return sim, act_maps


class PowerProtoPNet(nn.Module):
    def __init__(
        self,
        num_classes: int = NUM_CLASSES,
        num_prototypes: int = NUM_PROTOTYPES,
        prototype_dim: int = PROTOTYPE_DIM,
    ):
        super().__init__()
        self.backbone = ConvNeXtTinyBackbone()
        self.se = SEBlock(768)
        self.proj = SRM(768, prototype_dim)
        self.proto = PrototypeLayer(num_prototypes, prototype_dim)
        self.fc = nn.Linear(num_prototypes, num_classes, bias=False)

        self.num_classes = num_classes
        self.n_proto = num_prototypes
        self.per_class = PROTOTYPES_PER_CLASS
        self.proto_dim = prototype_dim

    def forward(self, x: torch.Tensor) -> tuple[torch.Tensor, torch.Tensor, torch.Tensor]:
        x = self.proj(self.se(self.backbone(x)))
        sim, act_maps = self.proto(x)
        return self.fc(sim), sim, act_maps

    def load_checkpoint(self, path: str, device: str | torch.device = "cpu") -> dict:
        ckpt = torch.load(path, map_location="cpu")
        self.load_state_dict(ckpt["model"], strict=True)
        if str(device) != "cpu":
            self.to(device)
        return ckpt


ProtoPNet = PowerProtoPNet
