const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const TAU = 2*Math.PI, results=[];
function close(a,b,tol=1e-9){assert(Math.abs(a-b)<tol,`${a} differs from ${b} by ${Math.abs(a-b)}`)}
function check(name,f){f();results.push({name,status:'passed'})}
function angular(f,N=8192){let s=0;for(let j=0;j<N;j++)s+=f(TAU*(j+.5)/N)/N;return s}
function kernel(r,p){return (1-r*r)/(1-2*r*Math.cos(p)+r*r)}
function poisson(r,t,h){return angular(p=>kernel(r,t-p)*h(p))}
function circle(f,x,y,R){return angular(t=>f(x+R*Math.cos(t),y+R*Math.sin(t)),720)}
function disk(f,x,y,R){let sum=0;for(let j=0;j<24;j++){const r=R*Math.sqrt((j+.5)/24);sum+=angular(t=>f(x+r*Math.cos(t),y+r*Math.sin(t)),180)/24}return sum}
check('Kernel positive and normalized at rho=0, 0.55, 0.95',()=>{for(const r of [0,.55,.95]){assert(kernel(r,.4)>0);close(angular(p=>kernel(r,p)),1)}});
check('Center value equals ordinary boundary average',()=>close(poisson(0,.8,p=>1+.7*Math.cos(p)+.25*Math.sin(2*p)),1));
check('First and second Fourier modes have rho^n attenuation',()=>{const r=.73,t=.81;close(poisson(r,t,p=>1+.7*Math.cos(p)+.25*Math.sin(2*p)),1+.7*r*Math.cos(t)+.25*r*r*Math.sin(2*t))});
check('Second cosine boundary mode',()=>close(poisson(.8,1.2,p=>1+.8*Math.cos(2*p)),1+.8*.8**2*Math.cos(2.4)));
check('Poisson boundary data recovered near boundary',()=>close(poisson(.999,0,Math.cos),.999,1e-3));
check('Harmonic circle mean at translated center',()=>{const f=(x,y)=>1+.7*x+.5*x*y;close(circle(f,.2,-.1,.5),f(.2,-.1))});
check('Harmonic disk mean at translated center',()=>{const f=(x,y)=>1+.7*x+.5*x*y;close(disk(f,.2,-.1,.5),f(.2,-.1))});
check('Nonharmonic circle and disk mean differences',()=>{const f=(x,y)=>1-x*x-y*y,R=.5;close(f(.2,-.1)-circle(f,.2,-.1,R),R*R);close(f(.2,-.1)-disk(f,.2,-.1,R),R*R/2)});
check('Constant circle and disk means',()=>{close(circle(()=>1,.4,.1,.3),1);close(disk(()=>1,.4,.1,.3),1)});
check('Harmonic outward derivatives cancel in line integral',()=>{const R=.75;close(TAU*R*angular(p=>2*R*Math.cos(2*p)),0)});
check('Nonharmonic boundary and interior integrals agree',()=>{const R=.5;close(TAU*R*angular(()=>2*R),4*Math.PI*R*R)});
check('Gradient-square integration gives energy parabola',()=>{for(const l of [-1.5,-.6,0,.6,1.5]){const integral=Math.PI*disk((x,y)=>.5*((1-2*l*x)**2+(-2*l*y)**2),0,0,1);close(integral,Math.PI/2+Math.PI*l*l);for(const t of [0,.5,1,2]){const x=Math.cos(t),y=Math.sin(t);close(x+l*(1-x*x-y*y),x)}}});
fs.writeFileSync(path.join(__dirname,'math-results.json'),JSON.stringify({checks:results.length,passed:results.length,results},null,2)+'\n');
console.log(`Mathematical checks: ${results.length}/${results.length} passed.`);
