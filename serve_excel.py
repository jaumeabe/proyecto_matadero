from http.server import HTTPServer, BaseHTTPRequestHandler
import pandas as pd
import json

filepath = 'C:/Users/jaumejr/Documents/GitHub/Proyecto albaranes matadero/GRANJAS CEBO.xlsx'

class Handler(BaseHTTPRequestHandler):
    def do_GET(self):
        try:
            xls = pd.ExcelFile(filepath)
            result = {'sheets': {}}
            for sheet in xls.sheet_names:
                df = pd.read_excel(filepath, sheet_name=sheet, header=None)
                result['sheets'][sheet] = df.fillna('').values.tolist()

            self.send_response(200)
            self.send_header('Content-Type', 'text/html')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()

            html = '<html><body><pre>'
            for sheet_name, rows in result['sheets'].items():
                html += f'\n=== Sheet: {sheet_name} ({len(rows)} rows) ===\n\n'
                for i, row in enumerate(rows):
                    html += f'Row {i}: {row}\n'
            html += '</pre></body></html>'
            self.wfile.write(html.encode())
        except Exception as e:
            self.send_response(500)
            self.send_header('Content-Type', 'text/plain')
            self.end_headers()
            self.wfile.write(str(e).encode())

print('Server starting on port 8765...')
HTTPServer(('127.0.0.1', 8765), Handler).serve_forever()
