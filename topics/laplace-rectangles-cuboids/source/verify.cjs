const fs=require('fs');
const path=require('path');
const html=fs.readFileSync(path.join(__dirname,'..','index.html'),'utf8');
const moduleCode=html.match(/<script type="module">([\s\S]*?)<\/script>/)?.[1];
if(!moduleCode)throw new Error('module script missing');
const noImports=moduleCode.replace(/^\s*import .*?;\s*$/gm,'');
new Function(noImports);
const getFunction=(name)=>{
  const start=noImports.indexOf(`function ${name}(`);
  if(start<0)throw new Error(`Missing function ${name}`);
  let level=0,opened=false;
  for(let i=start;i<noImports.length;i++){
    if(noImports[i]==='{'){level++;opened=true}
    if(noImports[i]==='}'){level--;if(opened&&level===0)return noImports.slice(start,i+1)}
  }
  throw new Error(`Unclosed function ${name}`);
};
const mathCode=['sinhRatio','boundaryX','rectU','cubeU'].map(getFunction).join('\n');
const {boundaryX,rectU,cubeU}=new Function(`${mathCode}\nreturn {boundaryX,rectU,cubeU}`)();
const p={a:2,b:1.4,c:1.5,q:.35};
const near=(actual,expected,tol=1e-12)=>{if(Math.abs(actual-expected)>tol)throw new Error(`Expected ${expected}, got ${actual}`)};
for(let j=0;j<15;j++){
  const x=p.a*j/14,y=p.b*j/14,z=p.c*j/14;
  near(rectU(x,0,p),0);near(rectU(0,y,p),0);near(rectU(p.a,y,p),0);
  near(rectU(x,p.b,p),boundaryX(x,p));
  near(cubeU(x,y,0,p),0);near(cubeU(0,y,z,p),0);near(cubeU(p.a,y,z,p),0);
  near(cubeU(x,0,z,p),0);near(cubeU(x,p.b,z,p),0);
  near(cubeU(x,y,p.c,p),boundaryX(x,p)*Math.sin(Math.PI*y/p.b));
}
const second=(f,t,h)=>[-f(t+2*h)+16*f(t+h)-30*f(t)+16*f(t-h)-f(t-2*h)]/(12*h*h);
let worst=0;
for(const [x,y,z] of [[.34,.43,.47],[.87,.79,.81],[1.43,.55,.99]]){
  const h=.001;
  const r=second(xx=>rectU(xx,y,p),x,h)+second(yy=>rectU(x,yy,p),y,h);
  const c=second(xx=>cubeU(xx,y,z,p),x,h)+second(yy=>cubeU(x,yy,z,p),y,h)+second(zz=>cubeU(x,y,zz,p),z,h);
  worst=Math.max(worst,Math.abs(r),Math.abs(c));
}
if(worst>1e-7)throw new Error(`Laplacian residual too large: ${worst}`);
const tags=['div','table','tr','section','article'];
for(const tag of tags){
  const opens=(html.match(new RegExp(`<${tag}\\b`,'g'))||[]).length;
  const closes=(html.match(new RegExp(`</${tag}>`,'g'))||[]).length;
  if(opens!==closes)throw new Error(`${tag} counts: ${opens} vs ${closes}`);
}
for(const id of ['mode','a','b','c','q','slice','update','heatmap','threeWrap','minValue','maxValue','centerValue','interpretation']){
  if(!html.includes(`id="${id}"`))throw new Error(`Missing ${id}`);
}
console.log('Syntax: OK');
console.log('Boundary conditions: OK');
console.log(`Fourth-order finite-difference Laplacian: max residual ${worst.toExponential(3)}`);
console.log('Structure and required controls: OK');
