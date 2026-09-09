import sys
import json
from pathlib import Path

import torch
from PIL import Image
from torchvision import transforms


# ============================================================
# PATHS
# ============================================================

# # THIS IS THE CORRECT V8 MODEL FOLDER
# V8_DIR = Path(
#     r"D:\SIH Project\ProtoPNet-Crop-Disease\V8_Full_POWER-ProtoPNet_s42"
# )

# YOUR ACTUAL MODEL FILE
MODEL_PATH = Path(
    r"D:\SIH Project\ProtoPNet-Crop-Disease\checkpoints\checkpoint\V8_Full_POWER-ProtoPNet_s42.pth"
)

# YOUR TEST IMAGE
IMAGE_PATH = Path(
    r"D:\SIH Project\ProtoPNet-Crop-Disease\test_image1.jpeg"
)

# YOUR CLASS FILE
CLASSES_PATH = Path(
    r"D:\SIH Project\ProtoPNet-Crop-Disease\test2.jpeg"
)


# ============================================================
# IMPORTANT:
# FORCE PYTHON TO USE V8 model.py
# ============================================================

# sys.path.insert(0, str(V8_DIR))

from power_model import PowerProtoPNet as ProtoPNet


# ============================================================
# DEVICE
# ============================================================

device = torch.device(
    "cuda" if torch.cuda.is_available() else "cpu"
)

print("=" * 65)
print("          POWER-ProtoPNet CROP DISEASE")
print("                    INFERENCE")
print("=" * 65)

print("\nDevice:", device)

if torch.cuda.is_available():
    print(
        "GPU:",
        torch.cuda.get_device_name(0)
    )


# ============================================================
# CHECK FILES
# ============================================================

print("\nChecking files...")

print("V8 model folder:")
# print(V8_DIR)

print("\nCheckpoint:")
print(MODEL_PATH)

print("\nTest image:")
print(IMAGE_PATH)


# if not V8_DIR.exists():
#     raise FileNotFoundError(
#         f"\nV8 model folder not found:\n{V8_DIR}"
#     )


# if not MODEL_PATH.exists():
#     raise FileNotFoundError(
#         f"\nMODEL FILE NOT FOUND:\n{MODEL_PATH}"
#     )


# if not IMAGE_PATH.exists():
#     raise FileNotFoundError(
#         f"\nIMAGE FILE NOT FOUND:\n{IMAGE_PATH}"
#     )


# if not CLASSES_PATH.exists():
#     raise FileNotFoundError(
#         f"\nclasses.json not found:\n{CLASSES_PATH}"
#     )


# print("\nAll required files found!")


# ============================================================
# VERIFY WHICH MODEL.PY IS BEING USED
# ============================================================

import power_model

print("\nPython is using power_model.py:")
print(power_model.__file__)


# ============================================================
# LOAD CLASSES
# ============================================================

with open(
    CLASSES_PATH,
    "r",
    encoding="utf-8"
) as f:

    class_data = json.load(f)


classes = sorted(
    class_data["classes"],
    key=lambda x: x["index"]
)

NUM_CLASSES = len(classes)

print("\nNumber of classes:", NUM_CLASSES)


# ============================================================
# IMAGE PREPROCESSING
# ============================================================

transform = transforms.Compose([

    transforms.Resize((224, 224)),

    transforms.ToTensor(),

    transforms.Normalize(
        mean=[0.485, 0.456, 0.406],
        std=[0.229, 0.224, 0.225]
    )
])


# ============================================================
# CREATE MODEL
# ============================================================

print("\nCreating POWER-ProtoPNet...")

model_instance = ProtoPNet()

print("Model created.")


# ============================================================
# LOAD TRAINED CHECKPOINT
# ============================================================

print("\nLoading trained checkpoint...")

model_instance.load_checkpoint(
    str(MODEL_PATH),
    device
)

model_instance = model_instance.to(device)

model_instance.eval()

print("SUCCESS: trained checkpoint loaded!")


# ============================================================
# LOAD IMAGE
# ============================================================

print("\nLoading image...")

image = Image.open(
    IMAGE_PATH
).convert("RGB")

print(
    "Original image size:",
    image.size
)


# ============================================================
# PREPROCESS
# ============================================================

input_tensor = transform(image)

# [3,224,224]
#       ↓
# [1,3,224,224]

input_tensor = input_tensor.unsqueeze(0)

input_tensor = input_tensor.to(device)


print(
    "Input tensor shape:",
    tuple(input_tensor.shape)
)


# ============================================================
# INFERENCE
# ============================================================

print("\nRunning inference...")

with torch.no_grad():

    logits, similarities, activation_maps = model_instance(
        input_tensor
    )


print("Inference completed!")

print(
    "Logits shape:",
    tuple(logits.shape)
)

print(
    "Similarity shape:",
    tuple(similarities.shape)
)


# ============================================================
# SOFTMAX
# ============================================================

probabilities = torch.softmax(
    logits,
    dim=1
)[0]


# ============================================================
# TOP PREDICTION
# ============================================================

confidence, predicted_index = torch.max(
    probabilities,
    dim=0
)

predicted_index = predicted_index.item()

confidence = confidence.item()

predicted = classes[predicted_index]


# ============================================================
# FINAL RESULT
# ============================================================

print("\n")
print("=" * 65)
print("                     RESULT")
print("=" * 65)

print(
    "Class Index :", 
    predicted_index
)

print(
    "Class       :",
    predicted["name"]
)

print(
    "Crop        :",
    predicted["plant"]
)

print(
    "Confidence  :",
    f"{confidence * 100:.2f}%"
)

if predicted["healthy"]:

    print(
        "Status      : HEALTHY"
    )

else:

    print(
        "Status      : DISEASE"
    )

    print(
        "Causal      :",
        predicted["causal"]
    )

    print(
        "Scientific  :",
        predicted["scientific"]
    )

    print(
        "Severity    :",
        predicted["severity"]
    )

print("=" * 65)


# ============================================================
# TOP 5 PREDICTIONS
# ============================================================

print("\n")
print("=" * 65)
print("                 TOP 5 PREDICTIONS")
print("=" * 65)

top_k = min(5, NUM_CLASSES)

top_probs, top_indices = torch.topk(
    probabilities,
    top_k
)

for rank, (prob, index) in enumerate(
    zip(top_probs, top_indices),
    start=1
):

    index = index.item()

    prob = prob.item()

    print(
        f"{rank}. "
        f"{classes[index]['name']:<45} "
        f"{prob * 100:.2f}%"
    )

print("=" * 65)