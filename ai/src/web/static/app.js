'use strict';
const $ = selector => document.querySelector(selector);
const clone = value => structuredClone(value);
let catalog, mode = 'experiment', config, yamlText = '', valid = false, revision = 0, timer, savedPath = null;
const drafts = {};
const titles = {name:'실험 이름',seed:'Random seed',dataset_path:'후보 데이터셋 Parquet',metadata_path:'데이터셋 메타데이터',output_dir:'결과 저장 폴더',model:'모델',features:'입력 특성',split:'데이터 분할',evaluation:'평가',source_json:'사용자·요청 JSON',version:'생성 버전',expected_users:'예상 사용자 수',expected_requests:'예상 요청 수',routing_worker_dir:'Routing worker 폴더',worker_python:'워커 Python 경로',data_root:'공간 데이터 폴더',graph_path:'도로 그래프 GraphML',workers:'병렬 프로세스 수',n_directions:'초기 탐색 방향 수',timeout_seconds:'전체 실행 제한 (초)',request_error:'요청 오류 처리',candidates:'후보 수 정책',utility:'정답 Utility',minimum:'최소 후보 수',target:'목표 후보 수',maximum:'최대 후보 수',shortage:'후보 부족 처리',excess:'초과 후보 선택',retries:'추가 탐색 횟수',strategy:'분할 방식',cold_user_ratio:'Cold 사용자 비율',validation_requests:'사용자별 검증 요청 수',test_requests:'사용자별 Warm 평가 요청 수',min_train_requests:'최소 학습 요청 수',insufficient_user:'요청 부족 사용자 처리',top_k:'평가 Top K',bootstrap_samples:'신뢰구간 Bootstrap 횟수',confidence_level:'신뢰수준',use_profile:'사용자 선호',use_request:'요청 조건·가중치',use_requirements:'필수조건',use_candidate_features:'경로 특성',use_condition_score:'기존 condition_score',use_history:'과거 선택 이력',relevance_levels:'Relevance 등급 수',tie_decimals:'Utility 동점 판정 소수 자릿수',profile_share:'장기 사용자 선호 비중',distance_tolerance_ratio:'거리 오차 척도',slope_scale_pct:'경사 페널티 척도 (%)',facility_scale_per_km:'시설 포화 척도 (/km)',night_scale_per_km:'야간 시설 포화 척도 (/km)',flow_scale_per_km:'신호·횡단보도 척도 (/km)',requirement_violation_penalty:'필수조건 위반당 감점',missing_satisfaction:'측정 누락 시 만족도'};
const choiceLabels = {user_temporal_holdout:'사용자 분리 + 요청 순서 Holdout',exclude:'기록 후 제외',error:'오류로 실행 중단',seeded_sample:'Seed 기반 무작위 축소',preference_v1:'Preference v1 · 원본 특성 기반'};
function element(tag, className, text) {const node=document.createElement(tag); if(className)node.className=className; if(text!==undefined)node.textContent=text;return node;}
function notify(text, error=false){const node=$('#message');node.textContent=text;node.classList.toggle('error',error);node.style.display='block';clearTimeout(node.hideTimer);node.hideTimer=setTimeout(()=>node.style.display='none',error?12000:4500);}
async function request(path, body){const response=await fetch(path,body===undefined?{}:{method:'POST',headers:{'Content-Type':'application/json','X-RunStop-Token':catalog.token},body:JSON.stringify(body)});const data=await response.json();if(!response.ok)throw Error(data.error||response.statusText);return data;}
function at(path){return path.reduce((o,key)=>o[key],config);}
function put(path,value){const parent=path.slice(0,-1).reduce((o,key)=>o[key],config);parent[path.at(-1)]=value;}
function resolve(schema,root){return schema.$ref?{...root.$defs[schema.$ref.split('/').at(-1)],...Object.fromEntries(Object.entries(schema).filter(([k])=>k!=='$ref'))}:schema;}
function dirty(){valid=false;savedPath=null;revision++;$('#validation-badge').textContent='검증 중';$('#validation-badge').classList.remove('invalid');setButtons();clearTimeout(timer);timer=setTimeout(()=>validate(),220);updateCommand();}
function setButtons(){for(const id of ['#save-button','#download-button','#copy-command'])$(id).disabled=!valid;}
function updateCommand(){const filename=$('#save-name').value;const folder=mode==='experiment'?'experiments':'generation';const script=mode==='experiment'?'run_experiment':'generate_dataset';const path=savedPath||`configs/${folder}/${filename}.yaml`;$('#command').textContent=`${catalog.python_command} ai/scripts/${script}.py --config "ai/${path}"`;}
function field(container,key,schema,path,root){
 schema=resolve(schema,root); const nullable=!!schema.anyOf?.some(x=>x.type==='null');
 if(schema.anyOf){const branch=resolve(schema.anyOf.find(x=>x.type!=='null'),root);schema={...schema,...branch};}
 const value=at(path), wrapper=element('div','field');const id='field-'+path.join('-');
 if(schema.type==='string'&&!schema.enum&&!('const'in schema))wrapper.classList.add('wide');
 const label=element('label','',titles[key]||key);label.htmlFor=id;wrapper.append(label);
 let input;
 if(schema.type==='boolean'||typeof schema.const==='boolean'){
  wrapper.classList.add('toggle-field');input=element('input');input.type='checkbox';input.checked=!!value;input.disabled='const'in schema;label.prepend(input);input.addEventListener('change',()=>{put(path,input.checked);dirty();});
 }else if(schema.enum||'const'in schema){
  input=element('select');const options=schema.enum||[schema.const];if(nullable){const option=element('option','','기본값 / 없음');option.value='';input.append(option);}
  for(const optionValue of options){const option=element('option','',choiceLabels[optionValue]||String(optionValue));option.value=String(optionValue);input.append(option);}
  input.value=value===null?'':String(value);input.disabled='const'in schema;input.addEventListener('change',()=>{put(path,input.value===''&&nullable?null:input.value);dirty();});wrapper.append(input);
 }else{
  input=element('input');const numeric=schema.type==='integer'||schema.type==='number';input.type=numeric?'number':'text';input.value=value??'';if(nullable)input.placeholder='제한 없음 (null)';
  if(numeric){input.step=schema.type==='integer'?'1':'any';if(schema.minimum!==undefined)input.min=schema.minimum;if(schema.maximum!==undefined)input.max=schema.maximum;}
  if(schema.pattern)input.pattern=schema.pattern;input.addEventListener('input',()=>{let v=input.value;if(numeric)v=v===''?(nullable?null:''):Number(v);put(path,v);dirty();});wrapper.append(input);
 }
 input.id=id;input.name=path.join('.');
 let description=schema.description;
 if(key==='use_history')description='현재 JSON에는 관측 선택 이력이 없어 비활성화되어 있습니다.';
 if(key==='worker_python')description='빈 값이면 현재 Python. 다른 환경을 쓰려면 python.exe의 절대 경로';
 if(key==='strategy')description='지원 분할 1종. 배열 순서를 가정하며, 5건이면 기본 학습 3 / 검증 1 / 평가 1.';
 if(description){const help=element('small','',description);help.id=id+'-help';input.setAttribute('aria-describedby',help.id);wrapper.append(help);}
 container.append(wrapper);
}
function fields(container,objSchema,path,root){objSchema=resolve(objSchema,root);for(const [key,raw]of Object.entries(objSchema.properties||{})){
 if(['kind','schema_version'].includes(key))continue;
 const schema=resolve(raw,root);
 if(schema.type==='object'){container.append(element('div','subheading',titles[key]||key));fields(container,schema,[...path,key],root);}else field(container,key,schema,[...path,key],root);
}}
function card(title,index,description){const node=element('section','card');const heading=element('div','card-title');heading.append(element('span','',String(index).padStart(2,'0')),element('h3','',title));node.append(heading);if(description)node.append(element('p','card-description',description));const body=element('div','fields');node.append(body);$('#config-form').append(node);return body;}
function render(){
 $('#config-form').replaceChildren();const root=catalog.schemas[mode];let number=0;
 if(mode==='experiment'){
  let body=card('실험 · 데이터셋',++number,'생성 완료된 Parquet과 메타데이터를 지정하세요. 상대 경로는 ai/ 기준입니다.');
  for(const key of ['name','seed','dataset_path','metadata_path','output_dir'])field(body,key,root.properties[key],[key],root);
  body=card('모델 선택',++number,'모델별 지원 파라미터만 표시합니다. 미설치 모델도 설정 저장은 가능합니다.');
  const wrap=element('div','field wide'), label=element('label','','랭킹 모델');label.htmlFor='model-select';const select=element('select');select.id='model-select';
  for(const model of catalog.models){const option=element('option','',model.title);option.value=model.name;select.append(option);}select.value=config.model.name;wrap.append(label,select);body.append(wrap);
  const model=catalog.models.find(m=>m.name===config.model.name);body.append(element('div','model-status'+(model.installed?'':' missing'),`${model.installed?'설치됨':'미설치 · 실행 전 '+model.library+' 설치 필요'} · ${model.description}`));
  select.addEventListener('change',()=>{config.model={name:select.value,params:clone(catalog.models.find(m=>m.name===select.value).defaults)};render();dirty();});
  fields(body,model.params_schema,['model','params'],model.params_schema);
  for(const key of ['features','split','evaluation']){body=card(titles[key],++number,key==='evaluation'?'NDCG · Top1 최상 Utility 적중 · Utility regret · 후보 쌍 정확도. 신뢰구간은 사용자 단위 Bootstrap.':'');fields(body,root.properties[key],[key],root);}
 }else{
  let body=card('입력 · 생성 버전',++number,'기존 사용자·요청 JSON을 읽습니다. 이 화면에서는 변환을 실행하지 않습니다.');
  for(const key of ['source_json','version','seed','expected_users','expected_requests','output_dir'])field(body,key,root.properties[key],[key],root);
  body=card('Routing worker 연결',++number,'공간 데이터가 없으면 명령 실행 전에 중단합니다. 워커 코드는 수정하지 않습니다.');
  for(const key of ['routing_worker_dir','worker_python','data_root','graph_path','workers','n_directions','timeout_seconds','request_error'])field(body,key,root.properties[key],[key],root);
  body=card('후보 수 정책',++number,'목표 8개는 탐색 목표입니다. 6–10개를 허용하고 부족한 후보를 복제하지 않습니다.');fields(body,root.properties.candidates,['candidates'],root);
  body=card('정답 순서 · Utility',++number,'원본 경로 특성과 사용자 선호로 합성 정답을 정의합니다. 변경하면 새 데이터셋 버전으로 생성하세요.');fields(body,root.properties.utility,['utility'],root);
 }
 updateCommand();
}
function switchMode(next){if(config)drafts[mode]=clone(config);mode=next;config=clone(drafts[mode]||catalog.defaults[mode]);$('#experiment-tab').classList.toggle('active',mode==='experiment');$('#generation-tab').classList.toggle('active',mode==='generation');$('#page-title').textContent=mode==='experiment'?'추천 순위를 실험하세요.':'정답 데이터의 기준을 만드세요.';$('#page-description').textContent=mode==='experiment'?'같은 데이터, 같은 기준으로 모델을 비교하는 실험 설정을 만듭니다.':'사용자 요청부터 후보 수와 Utility까지, 다음 데이터 생성의 조건을 정의합니다.';$('#editor-title').textContent=mode==='experiment'?'실험 구성':'데이터 생성 구성';$('#support-caption').textContent=mode==='experiment'?'모델 7종 · 분할 1종':'실행은 CLI에서 · Utility 1종';$('#save-name').value=mode==='experiment'?'lightgbm_compare_v001':'candidates_v001';render();dirty();}
async function validate(){const stamp=revision;try{const result=await request('/api/validate',{config});if(stamp!==revision)return;yamlText=result.yaml;valid=true;$('#yaml-preview').textContent=yamlText;$('#validation-badge').textContent='검증 완료';$('#validation-badge').classList.remove('invalid');}catch(error){if(stamp!==revision)return;valid=false;yamlText='';$('#yaml-preview').textContent=error.message;$('#validation-badge').textContent='입력 확인';$('#validation-badge').classList.add('invalid');}setButtons();}
async function loadConfig(value){drafts[value.kind]=clone(value);if(mode===value.kind)config=clone(value);switchMode(value.kind);config=clone(value);drafts[mode]=clone(value);render();dirty();}
$('#config-form').addEventListener('submit',event=>event.preventDefault());
$('#experiment-tab').onclick=()=>switchMode('experiment');$('#generation-tab').onclick=()=>switchMode('generation');
$('#save-name').oninput=()=>{savedPath=null;updateCommand();};
$('#save-button').onclick=async()=>{try{const stamp=revision;const result=await request('/api/save',{config,name:$('#save-name').value});if(stamp===revision){savedPath=result.path;updateCommand();}notify(`저장 완료: ai/${result.path}`);}catch(error){notify(error.message,true);}};
$('#download-button').onclick=()=>{const url=URL.createObjectURL(new Blob([yamlText],{type:'application/yaml;charset=utf-8'}));const link=element('a');link.href=url;link.download=($('#save-name').value||mode)+'.yaml';link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);};
$('#copy-command').onclick=async()=>{try{await navigator.clipboard.writeText($('#command').textContent);notify('명령어를 복사했습니다. YAML 저장 후 사용하세요.');}catch{notify('클립보드 접근이 불가능합니다. 표시된 명령어를 직접 복사하세요.',true);}};
$('#import-file').onchange=async event=>{try{const file=event.target.files[0];if(!file)return;if(file.size>900000)throw Error('YAML 파일은 900KB 이하로 선택하세요');const result=await request('/api/import',{yaml:await file.text()});await loadConfig(result.config);notify('YAML을 불러왔습니다. 저장 전까지 파일은 변경되지 않습니다.');}catch(error){notify(error.message,true);}finally{event.target.value='';}};
$('#load-button').onclick=async()=>{try{const entries=await request('/api/configs');const list=$('#saved-list');list.replaceChildren();if(!entries.length)list.append(element('p','','저장된 설정이 없습니다.'));for(const entry of entries){const button=element('button','saved-entry',entry.path);button.type='button';button.onclick=()=>{loadConfig(entry.config);$('#saved-dialog').close();};list.append(button);}$('#saved-dialog').showModal();}catch(error){notify(error.message,true);}};
$('#close-dialog').onclick=()=>$('#saved-dialog').close();
(async()=>{try{catalog=await request('/api/catalog');const source=catalog.source;if(source.error)notify(source.error,true);$('#user-count').textContent=(source.users??0).toLocaleString();$('#request-count').textContent=(source.requests??0).toLocaleString();$('#source-name').textContent=source.path;switchMode('experiment');}catch(error){$('#yaml-preview').textContent='서버 연결 실패: '+error.message;notify(error.message,true);}})();
