const { chromium } = require('playwright-core');
const fs=require('fs');
const LOGO='data:image/png;base64,'+fs.readFileSync('./logo-dark-mark.png').toString('base64');
const FONT="-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif";
const BG="radial-gradient(120% 130% at 80% 0%, #155e34 0%, #0b3d22 55%, #072a18 100%)";
const ball='<div style="position:absolute;right:-160px;bottom:-200px;width:680px;height:680px;border-radius:50%;background:radial-gradient(circle at 38% 32%,#fff,#e9efe6 38%,#c5cfbf);opacity:.06"></div>';
const cards = {
  'profile': `<div style="width:1080px;height:1080px;display:flex;align-items:center;justify-content:center;background:${BG}">
    <img src="${LOGO}" style="width:600px;height:600px;filter:drop-shadow(0 10px 40px rgba(0,0,0,.4))"></div>`,
  'post-hero': `<div style="width:1080px;height:1080px;position:relative;overflow:hidden;background:${BG};color:#fff;font-family:${FONT};display:flex;flex-direction:column;justify-content:center;padding:96px;box-sizing:border-box">
    ${ball}
    <div style="display:flex;align-items:center;gap:16px;margin-bottom:26px"><img src="${LOGO}" style="width:62px;height:62px"><span style="font-size:23px;font-weight:800;letter-spacing:.13em;text-transform:uppercase;color:#7ef0a8">The Golfer's Mass &amp; Speed System</span></div>
    <div style="font-size:118px;line-height:.98;font-weight:900;letter-spacing:-.04em">Turn muscle<br>into <span style="color:#7ef0a8">distance.</span></div>
    <div style="font-size:38px;font-weight:600;color:#dbe7da;margin-top:34px;max-width:840px">Build like a bodybuilder, move like a golfer — add lean mass and hit it longer.</div>
    <div style="position:absolute;bottom:64px;left:96px;right:96px;display:flex;justify-content:space-between;align-items:center"><span style="font-size:30px;font-weight:900;letter-spacing:.05em;color:#7ef0a8">EAT. LIFT. BOMB.</span><span style="font-size:30px;font-weight:800;opacity:.85">fairwayfuel.app</span></div></div>`,
  'post-bomb': `<div style="width:1080px;height:1080px;position:relative;overflow:hidden;background:${BG};color:#fff;font-family:${FONT};display:flex;flex-direction:column;align-items:center;justify-content:center">
    ${ball}
    <div style="font-size:188px;line-height:.96;font-weight:900;letter-spacing:-.03em;text-align:center">EAT.<br>LIFT.<br><span style="color:#7ef0a8">BOMB.</span></div>
    <div style="position:absolute;bottom:66px;font-size:32px;font-weight:800;color:#bfe3cd">Yardsmith · fairwayfuel.app</div></div>`,
  'post-thesis': `<div style="width:1080px;height:1080px;position:relative;overflow:hidden;background:${BG};color:#fff;font-family:${FONT};display:flex;flex-direction:column;justify-content:center;padding:96px;box-sizing:border-box">
    ${ball}
    <div style="font-size:26px;font-weight:800;letter-spacing:.18em;text-transform:uppercase;color:#7ef0a8;margin-bottom:30px">Real talk</div>
    <div style="font-size:104px;line-height:1.02;font-weight:900;letter-spacing:-.035em">Flexibility won't<br>add 20 yards.<br><span style="color:#7ef0a8">Power will.</span></div>
    <div style="font-size:36px;font-weight:600;color:#dbe7da;margin-top:38px">Stop stretching for distance. Start lifting.</div>
    <div style="position:absolute;bottom:64px;left:96px;font-size:30px;font-weight:800;color:#bfe3cd">Yardsmith · Turn muscle into distance</div></div>`,
  'post-stat': `<div style="width:1080px;height:1080px;position:relative;overflow:hidden;background:${BG};color:#fff;font-family:${FONT};display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;padding:80px;box-sizing:border-box">
    ${ball}
    <div style="font-size:30px;font-weight:800;letter-spacing:.16em;text-transform:uppercase;color:#7ef0a8;margin-bottom:24px">The math of distance</div>
    <div style="font-size:220px;line-height:.9;font-weight:900;color:#7ef0a8;letter-spacing:-.04em">+1<span style="font-size:88px;color:#fff"> mph</span></div>
    <div style="font-size:50px;font-weight:800;margin-top:14px">clubhead speed</div>
    <div style="font-size:62px;font-weight:900;margin-top:28px">≈ +2 yards of carry</div>
    <div style="position:absolute;bottom:66px;font-size:30px;font-weight:800;color:#bfe3cd">Train the engine. fairwayfuel.app</div></div>`
};
(async()=>{
  const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium'});
  for(const [name,html] of Object.entries(cards)){
    const p=await (await b.newContext({viewport:{width:1080,height:1080},deviceScaleFactor:1})).newPage();
    await p.setContent(html,{waitUntil:'load'}); await p.waitForTimeout(150);
    await p.screenshot({path:process.argv[2]+'/'+name+'.png'});
    await p.close();
  }
  await b.close(); console.log('rerendered');
})();
