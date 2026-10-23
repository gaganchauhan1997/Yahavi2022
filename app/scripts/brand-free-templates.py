"""Add an attributed HackKnow welcome tab without rewriting original worksheets.
Run manually with Python + lxml when curating original packages; normal builds use pinned offline ZIPs.
"""
from pathlib import Path
from io import BytesIO
from zipfile import ZipFile, ZipInfo, ZIP_DEFLATED
import base64, hashlib, json, textwrap
from lxml import etree as ET
APP = Path(__file__).resolve().parents[1]
S = 'http://schemas.openxmlformats.org/spreadsheetml/2006/main'
R = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships'
P = 'http://schemas.openxmlformats.org/package/2006/relationships'
C = 'http://schemas.openxmlformats.org/package/2006/content-types'
ET.register_namespace('r', R)
def tag(name): return '{'+S+'}'+name
def xml(root): return ET.tostring(root, encoding='utf-8', xml_declaration=True)
def archive(entries):
    output=BytesIO()
    with ZipFile(output,'w',ZIP_DEFLATED) as z:
        for name,data in entries.items():
            info=ZipInfo(name,(2026,10,23,0,0,0)); info.compress_type=ZIP_DEFLATED
            z.writestr(info,data)
    return output.getvalue()
def brand(original, item):
    with ZipFile(BytesIO(original)) as z: parts={n:z.read(n) for n in z.namelist()}
    workbook=ET.fromstring(parts['xl/workbook.xml']); sheets=workbook.find(tag('sheets'))
    if any(s.get('name')=='HackKnow' for s in sheets):
        raise ValueError('Already branded; curate from original package to avoid duplicate changes')
    rels=ET.fromstring(parts['xl/_rels/workbook.xml.rels']); types=ET.fromstring(parts['[Content_Types].xml'])
    styles=ET.fromstring(parts['xl/styles.xml']); fonts=styles.find(tag('fonts')); fills=styles.find(tag('fills')); xfs=styles.find(tag('cellXfs'))
    font_index=len(fonts); font=ET.SubElement(fonts,tag('font'))
    ET.SubElement(font,tag('b')); ET.SubElement(font,tag('sz'),{'val':'18'}); ET.SubElement(font,tag('name'),{'val':'Calibri'}); ET.SubElement(font,tag('color'),{'rgb':'FF0A0A0A'}); fonts.set('count',str(len(fonts)))
    fill_index=len(fills); fill=ET.SubElement(fills,tag('fill')); pattern=ET.SubElement(fill,tag('patternFill'),{'patternType':'solid'}); ET.SubElement(pattern,tag('fgColor'),{'rgb':'FFFFF055'}); ET.SubElement(pattern,tag('bgColor'),{'indexed':'64'}); fills.set('count',str(len(fills)))
    title_style=len(xfs); ET.SubElement(xfs,tag('xf'),{'numFmtId':'0','fontId':str(font_index),'fillId':str(fill_index),'borderId':'0','xfId':'0','applyFont':'1','applyFill':'1'})
    body_style=len(xfs); xf=ET.SubElement(xfs,tag('xf'),{'numFmtId':'0','fontId':'0','fillId':'0','borderId':'0','xfId':'0','applyAlignment':'1'}); ET.SubElement(xf,tag('alignment'),{'wrapText':'1','vertical':'top'}); xfs.set('count',str(len(xfs)))
    existing_ids={r.get('Id') for r in rels}; rid='rIdHackKnow'; i=1
    while rid in existing_ids: rid='rIdHackKnow'+str(i); i+=1
    sheet_id=max(int(s.get('sheetId')) for s in sheets)+1
    target='worksheets/hackknow.xml'
    if 'xl/'+target in parts: raise ValueError('Branding target already exists')
    ET.SubElement(sheets,tag('sheet'),{'name':'HackKnow','sheetId':str(sheet_id),'{'+R+'}id':rid})
    ET.SubElement(rels,'{'+P+'}Relationship',{'Id':rid,'Type':R+'/worksheet','Target':target})
    ET.SubElement(types,'{'+C+'}Override',{'PartName':'/xl/'+target,'ContentType':'application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml'})
    # Append the tab; existing sheet order/localSheetId/formulas remain intact.
    views=workbook.find(tag('bookViews'))
    if views is not None:
        for view in views: view.set('activeTab',str(len(sheets)-1))
    page=ET.Element(tag('worksheet'), nsmap={None:S,'r':R}); views=ET.SubElement(page,tag('sheetViews')); ET.SubElement(views,tag('sheetView'),{'workbookViewId':'0'})
    cols=ET.SubElement(page,tag('cols')); ET.SubElement(cols,tag('col'),{'min':'1','max':'1','width':'105','customWidth':'1'})
    data=ET.SubElement(page,tag('sheetData'))
    content={1:'HACKKNOW',2:item['title'],4:'Free Excel resource · No account or payment required',6:'Visit HackKnow: https://www.hackknow.com/',7:'More free templates: https://www.hackknow.com/free-excel-templates/',9:'Need help? team@hackknow.com',11:'Curated and branded by HackKnow, Delhi, India.',13:'Original workbook by '+item['author']+'. Used under the MIT license.',14:'HackKnow added this welcome tab. Original worksheet cells, formulas and sample values are preserved.',15:'This is a third-party workbook, not an original HackKnow design. No source-author endorsement is claimed.',17:'Source: '+item['source'],18:'License: '+item['licenseSource'],20:'Keep the original copyright and MIT license notices when redistributing. See LICENSE.txt in this download.',22:'Sample values are examples, not customer records. Review and replace them before use.',23:'Check all formulas/results for your needs. Supplied as-is; no financial advice or accuracy guarantee.'}
    for number,text in content.items():
        row=ET.SubElement(data,tag('row'),{'r':str(number),'ht':'44' if number in [14,15,17,18,20,22,23] else '30','customHeight':'1'}); cell=ET.SubElement(row,tag('c'),{'r':'A'+str(number),'t':'inlineStr','s':str(title_style if number==1 else body_style)}); inline=ET.SubElement(cell,tag('is')); ET.SubElement(inline,tag('t')).text=text
    links=ET.SubElement(page,tag('hyperlinks'))
    urls={6:'https://www.hackknow.com/',7:'https://www.hackknow.com/free-excel-templates/',9:'mailto:team@hackknow.com',17:item['source'],18:item['licenseSource']}
    page_rels=ET.Element('{'+P+'}Relationships', nsmap={None:P})
    for row,url in urls.items():
        link_id='rIdLink'+str(row); ET.SubElement(links,tag('hyperlink'),{'ref':'A'+str(row),'{'+R+'}id':link_id}); ET.SubElement(page_rels,'{'+P+'}Relationship',{'Id':link_id,'Type':R+'/hyperlink','Target':url,'TargetMode':'External'})
    parts.update({'xl/workbook.xml':xml(workbook),'xl/_rels/workbook.xml.rels':xml(rels),'[Content_Types].xml':xml(types),'xl/styles.xml':xml(styles),'xl/'+target:xml(page),'xl/worksheets/_rels/hackknow.xml.rels':xml(page_rels)})
    return archive(parts)
manifest_path=APP/'src/content/free-excel-templates.json'; manifest=json.loads(manifest_path.read_text())
for item in manifest:
    path=APP/'resources/free-excel'/(item['slug']+'.zip.b64')
    with ZipFile(BytesIO(base64.b64decode(path.read_text()))) as package:
        name=next(n for n in package.namelist() if n.endswith('.xlsx')); original=package.read(name); license_text=package.read('LICENSE.txt')
    if hashlib.sha256(original).hexdigest()!=item['workbookSha256']: raise ValueError('Original hash mismatch: '+item['slug'])
    workbook=brand(original,item)
    readme=('HackKnow free Excel resource\n\n'+item['title']+'\n\nOriginal author: '+item['author']+'\nOriginal source: '+item['source']+'\nOriginal revision: '+item['sourceCommit']+'\nLicense: MIT; full original notice is in LICENSE.txt.\n\nAdapted by HackKnow: added a branded welcome tab, website/support/source links and branding styles. Original worksheet cells, formulas and sample values are preserved. No source-author endorsement is claimed.\n\nWebsite: https://www.hackknow.com/\nFree downloads: https://www.hackknow.com/free-excel-templates/\nSupport: team@hackknow.com\n\nFree download. No account or payment required.\nSample worksheet values are examples, not real customer records; replace before use. Review formulas for your needs. Supplied as-is; no financial advice or formula-accuracy guarantee. Keep all license notices when redistributing.\n')
    result=archive({name:workbook,'LICENSE.txt':license_text,'README.txt':readme.encode()}); digest=hashlib.sha256(result).hexdigest()
    item.update({'brandedWorkbookSha256':hashlib.sha256(workbook).hexdigest(),'branding':'HackKnow welcome tab, website/support links; original worksheets preserved','sha256':digest,'bytes':len(result),'download':'/downloads/free-excel/'+item['slug']+'-'+digest[:12]+'.zip'})
    path.write_text('\n'.join(textwrap.wrap(base64.b64encode(result).decode(),76))+'\n')
manifest_path.write_text(json.dumps(manifest,indent=2)+'\n')
print('Branded',len(manifest),'free licensed workbooks')
