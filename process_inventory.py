import pandas as pd
import json
from datetime import datetime

def convert_dates(obj):
    if pd.isna(obj):
        return ""
    if isinstance(obj, (datetime, pd.Timestamp)):
        try:
            return obj.strftime('%Y-%m-%d')
        except:
            return str(obj)
    return obj

def process_excel():
    xl = pd.ExcelFile('CIERRES MENSUAL.xlsx')
    insumos = xl.parse('CIERRE INSUMOS').fillna('')
    medicamentos = xl.parse('CIERRE MEDICAMENTOS ').fillna('')
    
    # Process both sheets
    data = {
        'insumos': insumos.to_dict(orient='records'),
        'medicamentos': medicamentos.to_dict(orient='records')
    }
    
    # Convert all timestamps to strings
    for category in data:
        for record in data[category]:
            for key, value in record.items():
                record[key] = convert_dates(value)
                
    with open('inventory_data.json', 'w', encoding='utf-8') as f:
        json.dump(data, f, indent=2, ensure_ascii=False)

if __name__ == '__main__':
    process_excel()
