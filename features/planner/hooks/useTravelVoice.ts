"use client";
import { useCallback, useEffect, useRef, useState } from 'react';
type Recognition = { lang:string; continuous:boolean; interimResults:boolean; maxAlternatives:number; start:()=>void; stop:()=>void; abort:()=>void; onresult:((event:{resultIndex:number;results:ArrayLike<{isFinal:boolean;0:{transcript:string}} >})=>void)|null; onerror:((event:{error:string})=>void)|null; onend:(()=>void)|null; onnomatch:(()=>void)|null; onspeechend:(()=>void)|null };
type Constructor = new()=>Recognition;
export function useTravelVoice(){
 const active=useRef<Recognition|null>(null),timer=useRef<ReturnType<typeof setTimeout>|null>(null);
 const [listening,setListening]=useState(false),[notice,setNotice]=useState('');
 const dispose=useCallback(()=>{const current=active.current;active.current=null;if(timer.current)clearTimeout(timer.current);timer.current=null;if(current){current.onresult=null;current.onerror=null;current.onend=null;current.onnomatch=null;current.onspeechend=null;try{current.abort();}catch{/* Already ended. */}}},[]);
 const cancel=useCallback(()=>{dispose();setListening(false);setNotice('듣기를 취소했어요. 일정은 바꾸지 않았습니다.');},[dispose]);
 useEffect(()=>{const hide=()=>{if(document.hidden&&active.current)cancel();};document.addEventListener('visibilitychange',hide);return()=>{document.removeEventListener('visibilitychange',hide);dispose();};},[cancel,dispose]);
 function start(onTranscript:(text:string)=>void){
  if(active.current)return;
  const provider=window as unknown as {SpeechRecognition?:Constructor;webkitSpeechRecognition?:Constructor},Constructor=provider.SpeechRecognition||provider.webkitSpeechRecognition;
  if(typeof Constructor!=='function'){setNotice('이 브라우저는 음성 입력을 지원하지 않아요. 아래에 같은 명령을 입력해 주세요.');return;}
  let recognition:Recognition;try{recognition=new Constructor();}catch{setNotice('음성 입력을 준비하지 못했어요. 아래에 같은 명령을 입력해 주세요.');return;}active.current=recognition;recognition.lang='ko-KR';recognition.continuous=false;recognition.interimResults=false;recognition.maxAlternatives=1;
  const current=()=>active.current===recognition;
  const finish=(message:string)=>{if(!current())return;dispose();setListening(false);setNotice(message);};
  recognition.onresult=event=>{if(!current())return;const result=event.results[event.resultIndex||0];if(!result?.isFinal)return;const text=typeof result[0]?.transcript==='string'?result[0].transcript.trim():'';if(text.length>200){finish('말이 너무 길어요. 장소 하나와 할 일을 짧게 말해 주세요.');return;}finish(text?'들은 말을 확인해 주세요. 확인 버튼을 누르기 전에는 일정이 바뀌지 않습니다.':'말을 알아듣지 못했어요. 다시 듣거나 글로 입력해 주세요.');if(text)onTranscript(text);};
  recognition.onerror=event=>finish(event.error==='not-allowed'||event.error==='service-not-allowed'?'마이크 또는 음성 서비스 사용이 허용되지 않았어요. 글로 같은 명령을 입력할 수 있습니다.':event.error==='no-speech'?'음성을 듣지 못했어요. 다시 듣거나 글로 입력해 주세요.':'음성 입력을 마치지 못했어요. 연결과 마이크를 확인하거나 글로 입력해 주세요.');
  recognition.onnomatch=()=>finish('말을 알아듣지 못했어요. 장소 이름을 다시 말하거나 글로 입력해 주세요.');
  recognition.onend=()=>finish('듣기를 마쳤어요. 들은 말이 없으면 다시 듣거나 글로 입력해 주세요.');
  recognition.onspeechend=()=>{if(current())try{recognition.stop();}catch{finish('음성 입력을 마쳤어요. 글로도 명령을 입력할 수 있습니다.');}};
  setListening(true);setNotice('듣고 있어요. 장소 이름과 할 일을 짧게 말해 주세요.');
  timer.current=setTimeout(()=>finish('듣는 시간이 끝났어요. 다시 시작하거나 글로 입력해 주세요.'),20000);
  try{recognition.start();}catch{finish('마이크를 시작하지 못했어요. 글로 같은 명령을 입력할 수 있습니다.');}
 }
 function stop(){const current=active.current;if(!current)return;try{current.stop();if(active.current===current)setNotice('듣기를 마치고 말을 확인하고 있어요.');}catch{cancel();}}
 return{listening,notice,start,stop,cancel};
}
