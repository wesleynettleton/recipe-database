# Sample Data Files

Please place your Excel files in this folder. The system expects two files:

## 1. Ingredients File (e.g., `ingredients.xlsx`)
Expected columns:
- Product Code (unique identifier)
- Name (ingredient name)
- Price (cost per unit)

## 2. Allergies File (e.g., `allergies.xlsx`)
Expected columns:
- Product Code (matching the ingredient file)
- Allergy (allergy information)

## Example File Structure:
```
sample_data/
├── ingredients.xlsx
├── allergies.xlsx
└── README.md
```

The system will match records by Product Code and create a combined database of ingredients with their associated allergies and pricing information. 