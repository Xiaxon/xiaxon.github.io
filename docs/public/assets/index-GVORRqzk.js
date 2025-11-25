(function(){const e=document.createElement("link").relList;if(e&&e.supports&&e.supports("modulepreload"))return;for(const o of document.querySelectorAll('link[rel="modulepreload"]'))i(o);new MutationObserver(o=>{for(const a of o)if(a.type==="childList")for(const c of a.addedNodes)c.tagName==="LINK"&&c.rel==="modulepreload"&&i(c)}).observe(document,{childList:!0,subtree:!0});function n(o){const a={};return o.integrity&&(a.integrity=o.integrity),o.referrerPolicy&&(a.referrerPolicy=o.referrerPolicy),o.crossOrigin==="use-credentials"?a.credentials="include":o.crossOrigin==="anonymous"?a.credentials="omit":a.credentials="same-origin",a}function i(o){if(o.ep)return;o.ep=!0;const a=n(o);fetch(o.href,a)}})();const O={r1:Array(16).fill(null).map((t,e)=>({name:`TBD ${e+1}`,score:""})),qf:Array(8).fill(null).map((t,e)=>({name:`TBD ${e+1}`,score:""})),sf:Array(4).fill(null).map((t,e)=>({name:`TBD ${e+1}`,score:""})),f:Array(2).fill(null).map((t,e)=>({name:`TBD ${e+1}`,score:""})),champ:"TBD"},q="cs16_admin_auth";let s=JSON.parse(JSON.stringify(O));document.addEventListener("DOMContentLoaded",async()=>{try{const t=await fetch("/api/tournament");t.ok&&(s=await t.json())}catch{console.log("API not available, using defaults")}T(),w(),C(),N(),lucide.createIcons(),setInterval(async()=>{try{const t=await fetch("/api/tournament");if(t.ok){const e=await t.json();JSON.stringify(e)!==JSON.stringify(s)&&(s=e,T(),w())}}catch{console.log("Update poll failed")}},2e3),window.addEventListener("resize",()=>{document.getElementById("bracket").classList.contains("active")&&S()})});function N(){sessionStorage.getItem(q)==="true"?j():H()}function j(){document.getElementById("admin-login").classList.add("hidden"),document.getElementById("admin-content").classList.remove("hidden")}function H(){document.getElementById("admin-login").classList.remove("hidden"),document.getElementById("admin-content").classList.add("hidden")}function T(){document.getElementById("r1-list").innerHTML=s.r1.map((t,e)=>p(t,`r1-${e}`)).join(""),document.getElementById("qf-list").innerHTML=s.qf.map((t,e)=>p(t,`qf-${e}`)).join(""),document.getElementById("sf-list").innerHTML=s.sf.map((t,e)=>p(t,`sf-${e}`)).join(""),document.getElementById("f-list").innerHTML=s.f.map((t,e)=>p(t,`f-${e}`)).join(""),document.getElementById("champion-display").textContent=s.champ,setTimeout(S,50)}function p(t,e){const n=t.name,i=t.score,o=n!=="TBD",a=i?` <span class="team-score">${i}</span>`:"";return`
        <div id="${e}" class="team-card ${o?"filled":""}">
            <span class="team-name">${n}</span>${a}
        </div>
    `}function w(){document.getElementById("admin-r1").innerHTML=s.r1.map((e,n)=>`
        <div class="input-row">
            <span class="input-num">${String(n+1).padStart(2,"0")}</span>
            <input type="text" value="${e.name==="TBD"?"":e.name}" placeholder="Takım Adı" data-section="r1" data-index="${n}" data-field="name">
            <input type="text" value="${e.score}" placeholder="Skor" data-section="r1" data-index="${n}" data-field="score" class="score-input">
        </div>
    `).join(""),document.getElementById("admin-qf").innerHTML=s.qf.map((e,n)=>`
        <div class="input-row-qf">
            <input type="text" value="${e.name==="TBD"?"":e.name}" placeholder="ÇF ${n+1}" data-section="qf" data-index="${n}" data-field="name">
            <input type="text" value="${e.score}" placeholder="Skor" data-section="qf" data-index="${n}" data-field="score" class="score-input">
        </div>
    `).join(""),document.getElementById("admin-sf").innerHTML=s.sf.map((e,n)=>`
        <div class="input-row-sf">
            <input type="text" value="${e.name==="TBD"?"":e.name}" placeholder="YF ${n+1}" data-section="sf" data-index="${n}" data-field="name">
            <input type="text" value="${e.score}" placeholder="Skor" data-section="sf" data-index="${n}" data-field="score" class="score-input">
        </div>
    `).join(""),document.getElementById("admin-f").innerHTML=s.f.map((e,n)=>`
        <div class="input-row-f">
            <input type="text" value="${e.name==="TBD"?"":e.name}" placeholder="Finalist ${n+1}" data-section="f" data-index="${n}" data-field="name">
            <input type="text" value="${e.score}" placeholder="Skor" data-section="f" data-index="${n}" data-field="score" class="score-input">
        </div>
    `).join("");const t=document.getElementById("input-champ");t.value=s.champ==="TBD"?"":s.champ,t.setAttribute("data-section","champ")}function C(){let t;document.addEventListener("input",e=>{if(e.target.tagName==="INPUT"&&e.target.dataset.section){const n=e.target.dataset.section,i=parseInt(e.target.dataset.index),o=e.target.dataset.field,a=e.target.value;n==="champ"?s.champ=a||"TBD":o==="name"?s[n][i].name=a||"TBD":o==="score"&&(s[n][i].score=a),T(),clearTimeout(t),t=setTimeout(()=>{fetch("/api/tournament",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(s)}).catch(c=>console.log("Auto-save failed:",c))},1e3)}})}function S(){const t=document.getElementById("bracketSvg"),e=document.querySelector(".bracket-container");if(!e||!t)return;t.innerHTML="",t.setAttribute("width",e.scrollWidth),t.setAttribute("height",e.scrollHeight);const n=e.getBoundingClientRect(),i=e.scrollLeft,o=e.scrollTop,a=[{prefix:"r1",count:16},{prefix:"qf",count:8},{prefix:"sf",count:4},{prefix:"f",count:2}];for(let c=0;c<a.length-1;c++){const f=a[c],g=a[c+1],x=f.count/g.count;for(let d=0;d<g.count;d++){const I=d*x,b=I+x,L=document.getElementById(`${f.prefix}-${I}`),v=document.getElementById(`${f.prefix}-${b-1}`),E=document.getElementById(`${g.prefix}-${d}`);if(!L||!v||!E)continue;const h=L.getBoundingClientRect(),A=v.getBoundingClientRect(),y=E.getBoundingClientRect(),l=h.right-n.left+i,u=h.top-n.top+o+h.height/2,m=A.top-n.top+o+A.height/2,$=y.left-n.left+i,D=y.top-n.top+o+y.height/2,B=l+($-l)/2,r=document.createElementNS("http://www.w3.org/2000/svg","path"),M=`
                M ${l} ${u}
                L ${B} ${u}
                L ${B} ${m}
                L ${l} ${m}
                M ${B} ${(u+m)/2}
                L ${$} ${(u+m)/2}
                L ${$} ${D}
            `;r.setAttribute("d",M),r.setAttribute("stroke","rgba(220, 38, 38, 0.4)"),r.setAttribute("stroke-width","1.5"),r.setAttribute("fill","none"),r.setAttribute("class","line-shadow"),t.appendChild(r)}}}
