let context;
const melodies={hit:[180,110],special:[220,440,660],ko:[330,220,110],win:[262,330,392,523],loss:[294,262,196],item:[392,523],reward:[523,659,784]};
export function playGameSound(name,enabled) {
  if(!enabled)return;
  try{
    const Audio=window.AudioContext??window.webkitAudioContext;if(!Audio)return;
    context??=new Audio();context.resume().catch(()=>{});
    const notes=melodies[name]??melodies.hit;
    notes.forEach((frequency,index)=>{
      const oscillator=context.createOscillator(),gain=context.createGain(),start=context.currentTime+index*.075;
      oscillator.type=name==="hit"?"triangle":"sine";oscillator.frequency.setValueAtTime(frequency,start);
      gain.gain.setValueAtTime(0,start);gain.gain.linearRampToValueAtTime(.045,start+.01);gain.gain.exponentialRampToValueAtTime(.001,start+.12);
      oscillator.connect(gain);gain.connect(context.destination);oscillator.start(start);oscillator.stop(start+.13);
    });
  }catch{}
}
