/** Small anti-jitter centre, full travel at 26 px, responsive low-speed control. */
export function stickInput(x:number,y:number){
 const distance=Math.hypot(x,y);if(distance<=2)return {x:0,y:0};
 const travel=Math.min(1,(distance-2)/24)**.85;
 return {x:x/distance*travel,y:y/distance*travel};
}
