// Small lossless LZW codec for large local saves. No external dependencies.
// Codes are stored directly as UTF-16 code units; the original JSON is recovered exactly.
const PREFIX='PFGM-LZW1:';
export function encodeSave(raw:string){
 if(raw.length<800000)return raw;
 const input=new TextEncoder().encode(raw),dictionary=new Map<string,number>();let next=256,word='',output='';
 for(const byte of input){const ch=String.fromCharCode(byte),combined=word+ch;if(word===''||dictionary.has(combined)){word=combined;continue;}output+=String.fromCharCode(word.length===1?word.charCodeAt(0):dictionary.get(word)!);if(next<65535)dictionary.set(combined,next++);word=ch;}
 if(word)output+=String.fromCharCode(word.length===1?word.charCodeAt(0):dictionary.get(word)!);
 return PREFIX+output;
}
export function decodeSave(encoded:string){
 if(!encoded.startsWith(PREFIX))return encoded;
 const input=encoded.slice(PREFIX.length);if(!input.length)throw Error('Empty compressed save.');
 const dictionary:string[]=Array.from({length:256},(_,i)=>String.fromCharCode(i));let previous=dictionary[input.charCodeAt(0)],output=previous,next=256;
 if(previous===undefined)throw Error('Invalid compressed save.');
 for(let i=1;i<input.length;i++){const code=input.charCodeAt(i);const entry=dictionary[code]??(code===next?previous+previous[0]:undefined);if(entry===undefined)throw Error('Invalid compressed save.');output+=entry;if(next<65535)dictionary[next++]=previous+entry[0];previous=entry;}
 return new TextDecoder('utf-8',{fatal:true}).decode(Uint8Array.from(output,ch=>ch.charCodeAt(0)));
}
