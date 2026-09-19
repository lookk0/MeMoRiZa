const http=require('http');
const fs=require('fs');
const path=require('path');

const PORT=3000;
const ROOT=__dirname;
const SCORE_FILE=path.join(ROOT,'memoriza-scores.json');
const MIME={
  '.html':'text/html; charset=utf-8',
  '.js':'text/javascript; charset=utf-8',
  '.css':'text/css; charset=utf-8',
  '.json':'application/json; charset=utf-8',
  '.ico':'image/x-icon',
  '.png':'image/png',
  '.jpg':'image/jpeg',
  '.svg':'image/svg+xml'
};

function defaultScores(){
  return {app:'MeMoRiZa',version:1,exportedAt:null,scores:{easy:[],medium:[],hard:[]}};
}

function readScores(){
  try{
    const data=JSON.parse(fs.readFileSync(SCORE_FILE,'utf8'));
    if(data && data.scores) return data;
  }catch{}
  return defaultScores();
}

function sendJson(res,status,data){
  res.writeHead(status,{
    'Content-Type':'application/json; charset=utf-8',
    'Cache-Control':'no-store',
    'Access-Control-Allow-Origin':'*'
  });
  res.end(JSON.stringify(data));
}

function sendFile(res,file){
  fs.readFile(file,(err,data)=>{
    if(err){
      sendJson(res,404,{error:'File not found'});
      return;
    }
    const type=MIME[path.extname(file).toLowerCase()]||'application/octet-stream';
    res.writeHead(200,{'Content-Type':type,'Cache-Control':'no-cache'});
    res.end(data);
  });
}

const server=http.createServer((req,res)=>{
  const url=new URL(req.url,'http://localhost:'+PORT);

  if(req.method==='GET' && url.pathname==='/api/scores'){
    return sendJson(res,200,readScores());
  }

  if(req.method==='POST' && url.pathname==='/api/scores'){
    let body='';
    req.on('data',chunk=>{
      body+=chunk.toString();
      if(body.length>2_000_000){
        req.destroy();
      }
    });
    req.on('end',()=>{
      try{
        const data=JSON.parse(body);
        if(!data || !data.scores) throw new Error('Invalid score data');

        const clean=defaultScores();
        clean.exportedAt=new Date().toISOString();

        for(const mode of ['easy','medium','hard']){
          clean.scores[mode]=Array.isArray(data.scores[mode])
            ?data.scores[mode].filter(x=>
              Number.isFinite(x.moves)&&
              Number.isFinite(x.seconds)&&
              Number.isFinite(x.date))
            :[];
        }

        fs.writeFileSync(SCORE_FILE,JSON.stringify(clean,null,2),'utf8');
        sendJson(res,200,{ok:true});
      }catch(err){
        sendJson(res,400,{ok:false,error:err.message});
      }
    });
    return;
  }

  if(req.method!=='GET'){
    sendJson(res,405,{error:'Method not allowed'});
    return;
  }

  // Only serve files inside the MeMoRiZa folder.
  let relative=url.pathname==='/'?'index.html':decodeURIComponent(url.pathname.slice(1));
  const file=path.resolve(ROOT,relative);
  const rootWithSep=ROOT.endsWith(path.sep)?ROOT:ROOT+path.sep;

  if(file!==path.resolve(ROOT,'index.html') && !file.startsWith(rootWithSep)){
    sendJson(res,403,{error:'Forbidden'});
    return;
  }

  sendFile(res,file);
});

server.listen(PORT,'127.0.0.1',()=>{
  console.log('MeMoRiZa running at http://127.0.0.1:'+PORT);
  console.log('Scores saved to '+SCORE_FILE);
});
