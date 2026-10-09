/* Guest Cloud Save: opt-in only. Game's existing localStorage always works offline. */
(() => {
  'use strict';
  const S='kem-tron.save', K='kem-tron.cloud.key', ON='kem-tron.cloud.on', LAST='kem-tron.cloud.last', STAMP='kem-tron.cloud.stamp';
  let busy=false, conflict=false, queue=[], previous=null, lastRaw=null, changedAt=0;
  const get=k=>{try{return localStorage.getItem(k);}catch{return null;}};
  const set=(k,v)=>{try{localStorage.setItem(k,v);return true;}catch{return false;}};
  const parse=t=>{try{return JSON.parse(t);}catch{return null;}};
  const on=()=>get(ON)==='yes'&&!!get(K);
  const now=()=>Date.now();
  const keyValid=k=>/^kt1_[A-Za-z0-9_-]{43}$/.test(k||'');
  const newKey=()=> 'kt1_'+btoa(String.fromCharCode(...crypto.getRandomValues(new Uint8Array(32)))).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
  const event=(name,day,value=1)=>{
    if(!on())return;
    queue.push({id:crypto.randomUUID(),name,day:day||1,value,at:now()});
    if(queue.length>28)queue.shift();
  };
  const status=t=>{const e=document.getElementById('kt-cloud-status');if(e)e.textContent=t;};
  async function call(method,key,state,events){
    const options={method,headers:{Authorization:'Bearer '+key},cache:'no-store'};
    if(method==='POST'){options.headers['Content-Type']='application/json';options.body=JSON.stringify({state,updatedAt:now(),events});}
    const r=await fetch('/api/cloud',options);
    const data=await r.json().catch(()=>({}));
    if(!r.ok){const e=new Error(data.error||'HTTP_'+r.status);e.status=r.status;throw e;}
    return data;
  }
  function observe(oldS,newS){
    if(!on()||!newS||newS.v!==1)return;
    if(!oldS){event('game_started',newS.day);return;}
    if(newS.day>oldS.day)for(let d=oldS.day;d<Math.min(newS.day,oldS.day+10);d++)event('day_completed',d);
    for(const [field,name] of [['served','customer_served'],['exploded','mix_failed']]){
      const delta=(newS.stats?.[field]||0)-(oldS.stats?.[field]||0);
      if(delta>0)event(name,newS.day,delta);
    }
    if(!oldS.ended&&newS.ended)event('game_finished',newS.day);
  }
  async function sync(force=false){
    if(!on()||busy||conflict)return;
    const raw=get(S),state=parse(raw);
    if(!state||state.v!==1)return;
    if(!force&&raw===get(LAST)&&!queue.length)return;
    busy=true;const batch=queue.slice();
    try{
      const r=await call('POST',get(K),state,batch);
      if(r.ok){set(LAST,raw);set(STAMP,String(r.updatedAt));queue=queue.filter(e=>!batch.some(b=>b.id===e.id));status('Đã lưu trên cloud ✓');}
    }catch(e){
      if(e.status===409){conflict=true;status('Cloud có bản mới hơn. Hãy khôi phục thủ công.');}
      else status('Lưu trên máy thành công, cloud chưa đồng bộ: '+e.message);
    }finally{busy=false;}
  }
  async function activate(){
    if(!get(S)){status('Hãy bắt đầu một ván trước.');return;}
    if(!crypto?.getRandomValues||!crypto?.randomUUID){status('Trình duyệt không hỗ trợ tạo mã an toàn.');return;}
    set(K,get(K)||newKey());set(ON,'yes');previous=parse(get(S));
    event('cloud_enabled',previous?.day);event('game_started',previous?.day);
    await sync(true);draw();
  }
  async function recover(key){
    key=String(key||'').trim();
    if(!keyValid(key)){status('Mã khôi phục không đúng định dạng.');return;}
    status('Đang đọc cloud…');
    try{
      const remote=await call('GET',key);
      if(!remote.state||remote.state.v!==1||!Number.isInteger(remote.state.day))throw Error('INVALID_SAVE');
      if(get(S)&&!confirm('Khôi phục bản ngày '+remote.state.day+'? Tiến độ hiện có trên máy sẽ bị thay thế.')){status('Đã hủy.');return;}
      set(S,JSON.stringify(remote.state));set(K,key);set(ON,'yes');set(LAST,JSON.stringify(remote.state));set(STAMP,String(remote.updatedAt));location.reload();
    }catch(e){status('Khôi phục thất bại: '+e.message);}
  }
  function draw(){
    const box=document.getElementById('kt-cloud-content');if(!box)return;
    box.replaceChildren();
    const txt=document.createElement('p');
    txt.textContent=on()?(get(STAMP)?'Cloud Save đã từng đồng bộ. Mã khôi phục là chìa khóa truy cập — không chia sẻ công khai.':'Chưa kết nối cloud thành công. Tiến độ đang lưu trên máy; kiểm tra thông báo khi đồng bộ.'):'Tiến độ chỉ lưu trên máy. Khi bật cloud, game đồng bộ bản lưu và gửi thống kê chơi cơ bản, không cần tài khoản.';
    box.append(txt);
    const button=(name,fn)=>{const b=document.createElement('button');b.textContent=name;b.onclick=fn;box.append(b);};
    if(!on())button('Bật Cloud Save',activate);
    else {
      const code=document.createElement('code');
      code.textContent=get(K);code.style.cssText='display:block;overflow-wrap:anywhere;font-size:11px;padding:9px;border:1px dashed #8c7054;border-radius:8px;margin:8px 0';
      box.append(code);
      button('Sao chép mã khôi phục',async()=>{try{await navigator.clipboard.writeText(get(K));status('Đã sao chép.');}catch{status('Hãy chọn mã rồi sao chép.');}});
      button('Đồng bộ ngay',()=>sync(true));
      if(conflict)button('Xem bản cloud mới hơn',()=>recover(get(K)));
      button('Xóa save cloud',async()=>{
        if(!confirm('Xóa vĩnh viễn bản lưu và sự kiện chơi trên cloud? Bản lưu trên máy vẫn được giữ.'))return;
        try{await call('DELETE',get(K));for(const k of [K,ON,LAST,STAMP])try{localStorage.removeItem(k);}catch{};draw();status('Đã xóa dữ liệu cloud. Bản lưu trên máy vẫn nguyên vẹn.');}
        catch(e){status('Không xóa được dữ liệu cloud: '+e.message);}
      });
      button('Tắt Cloud Save',()=>{set(ON,'no');status('Đã tắt. Tiến độ trên máy vẫn giữ nguyên.');draw();});
    }
    button('Khôi phục bằng mã',()=>{const k=prompt('Nhập mã khôi phục kt1_…:');if(k!==null)recover(k);});
  }
  function open(){
    const existing=document.getElementById('kt-cloud-panel');
    if(existing){existing.remove();return;}
    const modal=document.createElement('div');modal.id='kt-cloud-panel';
    modal.style.cssText='position:fixed;inset:0;z-index:2147483645;background:#0009;display:flex;align-items:center;justify-content:center;padding:14px;font:15px system-ui;color:#382318';
    const content=document.createElement('section');
    content.style.cssText='box-sizing:border-box;width:min(410px,100%);max-height:80vh;overflow:auto;background:#fff2d6;border:3px solid #69482d;border-radius:18px;padding:18px';
    content.innerHTML='<h2 style="margin:0">☁ Lưu tiến độ</h2><div id="kt-cloud-content"></div><p id="kt-cloud-status" role="status" style="font-size:12px;min-height:1.3em"></p>';
    const style=document.createElement('style');style.textContent='#kt-cloud-content button{display:block;margin:9px 0;padding:10px 14px;border:1px solid #89623e;border-radius:9px;background:#ffe1a0;color:#382318;font-weight:bold;}';content.append(style);
    const close=document.createElement('button');close.textContent='Đóng';close.onclick=()=>modal.remove();content.append(close);
    modal.append(content);modal.onclick=e=>{if(e.target===modal)modal.remove();};document.body.append(modal);draw();
    if(conflict)status('Cloud có bản mới hơn. Tiến độ trên máy chưa bị ghi đè.');
  }
  function init(){
    // Integrate into existing in-game settings and title gear menu, no floating overlay during play.
    const attach = () => {
      const titleMenu=document.querySelector('.title-screen .gear-pop');
      if(titleMenu&&!titleMenu.querySelector('.kt-title-cloud')){
        const b=document.createElement('button');b.className='kt-title-cloud gp-mute';
        b.textContent='☁ Lưu / khôi phục';b.addEventListener('click',e=>{e.stopPropagation();open();});
        titleMenu.append(b);
      }
      const settings=document.querySelector('.settings .st-card');
      if(settings&&!settings.querySelector('.kt-setting-cloud')){
        const b=document.createElement('button');b.className='st-row kt-setting-cloud';
        b.innerHTML='<span>☁ Lưu tiến độ</span><b>CLOUD</b>';
        b.addEventListener('click',e=>{e.stopPropagation();open();});
        const resume=settings.querySelector('.st-resume');
        if(resume)resume.before(b);else settings.append(b);
      }
    };
    const host=document.querySelector('#modal');
    if(host)new MutationObserver(attach).observe(host,{childList:true,subtree:true});
    attach();
    lastRaw=get(S);previous=parse(lastRaw);
    if(on()){
      event('session_start',previous?.day);
      call('GET',get(K)).then(remote=>{
        if(lastRaw&&JSON.stringify(remote.state)!==lastRaw&&Number(remote.updatedAt)>Number(get(STAMP)||0))conflict=true;
        else sync();
      }).catch(e=>{if(e.status===404)sync(true);});
    }
    setInterval(()=>{
      const raw=get(S);
      if(raw!==lastRaw){observe(previous,parse(raw));previous=parse(raw);lastRaw=raw;changedAt=now();}
      if(on()&&changedAt&&now()-changedAt>12000){changedAt=0;sync();}
    },3000);
    document.addEventListener('visibilitychange',()=>{if(document.hidden&&on()){event('session_end',parse(get(S))?.day,0);sync(true);}});
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
