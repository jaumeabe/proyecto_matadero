import pandas as pd

filepath = 'C:/Users/jaumejr/Documents/GitHub/Proyecto albaranes matadero/GRANJAS CEBO.xlsx'
xls = pd.ExcelFile(filepath)
print('Sheet names:', xls.sheet_names)
print()

pd.set_option('display.max_columns', None)
pd.set_option('display.max_rows', None)
pd.set_option('display.width', 300)
pd.set_option('display.max_colwidth', 80)

for sheet in xls.sheet_names:
    print(f'=== Sheet: {sheet} ===')
    df = pd.read_excel(filepath, sheet_name=sheet, header=None)
    print(f'Shape: {df.shape}')
    print(df.to_string())
    print()
