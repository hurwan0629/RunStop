import json
import threading
from urllib.request import Request, urlopen
from urllib.error import HTTPError
import pytest
from ai.src.web.server import make_server


@pytest.fixture
def studio(tmp_path):
    server=make_server(0,tmp_path)
    thread=threading.Thread(target=server.serve_forever,daemon=True)
    thread.start()
    yield f'http://127.0.0.1:{server.server_port}',tmp_path
    server.shutdown()
    server.server_close()
    thread.join()


def fetch(url,body=None,token=None):
    headers={'Content-Type':'application/json'}
    if token: headers['X-RunStop-Token']=token
    req=Request(url,data=json.dumps(body).encode() if body is not None else None,headers=headers)
    with urlopen(req) as response: return json.load(response)


def test_ui_contract_save_import_and_no_execution(studio):
    url,root=studio
    info=fetch(url+'/api/catalog')
    assert len(info['models'])==7
    token=info['token']
    cfg=info['defaults']['experiment']
    response=fetch(url+'/api/save',{'config':cfg,'name':'test_config'},token)
    assert (root/response['path']).exists()
    imported=fetch(url+'/api/import',{'yaml':response['yaml']},token)
    assert imported['config']==cfg
    assert len(fetch(url+'/api/configs'))==1
    for path,body,auth,expected in [('/api/save',{'config':cfg,'name':'../escape'},token,400),
                                    ('/api/save',{'config':cfg,'name':'test_config'},token,409),
                                    ('/api/save',{'config':cfg,'name':'other'},None,403),
                                    ('/api/run',{},token,404)]:
        with pytest.raises(HTTPError) as error: fetch(url+path,body,auth)
        assert error.value.code==expected
    assert not (root/'datasets').exists() and not (root/'artifacts').exists()
