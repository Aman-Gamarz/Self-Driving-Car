const canvas = document.getElementById('canvas')
let ctx = canvas.getContext('2d')
const scale = window.devicePixelRatio; // get the device pixel ratio
const CANVAS_PX_WIDTH = 225 * scale;
const CANVAS_PX_HEIGHT = 500 * scale;
const CANVAS_WIDTH = 225;
const CANVAS_HEIGHT = 500;
canvas.width = CANVAS_PX_WIDTH; // set the canvas resolution
canvas.height = CANVAS_PX_HEIGHT;
canvas.style.width = 225 + 'px'; // set the display size
canvas.style.height = 500 + 'px';
let FPS = 30;
let latency = 1000/FPS;
const lerp = (a,b,t) => {
  return a + (b-a) *t
}
class Controls{
  constructor(){
    this.left = false
    this.right = false
    this.forward = false 
    this.reverse = false
  }
}
let controls = new Controls()
const steer=(dir)=>{
  if (dir == null) {
    controls.left = false
    controls.right = false
    controls.forward = false
    controls.reverse = false
  }
  switch (dir) {
    case -1:
      controls.left = true
      break;
    case 0.5:
      controls.forward = true
      break;
    case -0.5:
      controls.reverse = true
      break;
    case 1:
      controls.right = true
      break;
  }
}

class Road{
  constructor(){
    this.laneCount = 3
    this.left = 10
    this.right = CANVAS_WIDTH - 10
    const infinity = 10000;
    this.top = infinity
    this.bottom = -infinity
    
    this.borders = {
      left: this.left+5,
      right: this.right-5,
      top:this.top,
      bottom:this.bottom
    }
  }
  getLanCenter(ln){
    return (lerp(this.left, this.right, ln/this.laneCount) + lerp(this.left, this.right, ln/this.laneCount + 1/this.laneCount))/2
  }
  draw(){
    ctx.beginPath()
    ctx.lineWidth = 10
    ctx.strokeStyle = 'white'
    for (let i = 0; i <= this.laneCount; i++) {
      let x = lerp(
          this.left,
          this.right,
          i/this.laneCount
        )
      ctx.beginPath()
      if (i > 0 && i < this.laneCount){
        ctx.setLineDash([30,20])
      }else{
        ctx.setLineDash([])
      }
      ctx.moveTo(x, this.top)
      ctx.lineTo(x, this.bottom)
    ctx.stroke()
    }
  }
}
let road = new Road()

function getIntersection(A,B,C,D){ 
    const tTop=(D.x-C.x)*(A.y-C.y)-(D.y-C.y)*(A.x-C.x);
    const uTop=(C.y-A.y)*(A.x-B.x)-(C.x-A.x)*(A.y-B.y);
    const bottom=(D.y-C.y)*(B.x-A.x)-(D.x-C.x)*(B.y-A.y);
    
    if(bottom!=0){
        const t=tTop/bottom;
        const u=uTop/bottom;
        if(t>=0 && t<=1 && u>=0 && u<=1){
            return {
                x:lerp(A.x,B.x,t),
                y:lerp(A.y,B.y,t),
                offset:t
            }
        }
    }

    return null;
}

class Sensors{
  constructor(car){
    this.car = car
    this.sensorCount = 3
    this.sectorAngle = Math.PI/4
    this.sensorRange = 100
    this.sensors = []
    this.#init()
  }
  #init(){
    for (let i = 0; i < this.sensorCount; i++) {
      let angle = lerp(-this.sectorAngle/2,this.sectorAngle/2,i/(this.sensorCount-1))
      let newSensor = {
        x: Math.sin(angle)*this.sensorRange,
        y: -Math.cos(angle)*this.sensorRange,
        active: false,
        intersection: null
      }
      this.sensors.push(newSensor)
    }
    console.log(this.sensors)
  }
  draw(carX, carY, angle){
    this.sensors.forEach((e, index)=>{
      ctx.beginPath()
      ctx.lineWidth = 3
      ctx.strokeStyle="#ff0"
      ctx.moveTo(0,0)
      ctx.moveTo(0,0)
      if(e.active){
          ctx.lineTo((e.intersection.x - carX)*Math.cos(-angle) - (e.intersection.y - carY)*Math.sin(-angle), (e.intersection.x - carX)*Math.sin(-angle) + (e.intersection.y - carY)*Math.cos(-angle))
          ctx.stroke()
          ctx.strokeStyle="#f00"
          ctx.beginPath()
          ctx.moveTo((e.intersection.x - carX)*Math.cos(-angle) - (e.intersection.y - carY)*Math.sin(-angle), (e.intersection.x - carX)*Math.sin(-angle) + (e.intersection.y - carY)*Math.cos(-angle))
      }
      ctx.lineTo(e.x, e.y)
      ctx.stroke()
    })
  }
  listen(carX, carY, angle, traffic){
    // left lane
    let C = { x:road.borders.left, y: road.borders.top}
    let D = { x:road.borders.left, y: road.borders.bottom}
    // right lane
    let E = { x:road.borders.right, y: road.borders.top}
    let F ={ x:road.borders.right, y: road.borders.bottom}
    this.sensors.forEach((e, index)=>{
      let intersections = []
      // ray segment with side lane
      let A = { x:carX + (e.x * Math.cos(angle) - e.y * Math.sin(angle)), y: carY + (e.x * Math.sin(angle) + e.y * Math.cos(angle))}
      let B = { x:carX, y: carY}
      let left_intersection = getIntersection(A,B,C,D)
      let right_intersection = getIntersection(A,B,E,F)
      // with traffic
      for (let i = 0; i < traffic.length; i++) {
        for (let j = 0; j < traffic[i].polygon.length; j++) {
          let car_intersection;
          if(j==traffic[i].polygon.length-1){
            car_intersection = getIntersection(traffic[i].polygon[j], traffic[i].polygon[0], A, B)
          }else{
            car_intersection = getIntersection(traffic[i].polygon[j], traffic[i].polygon[j+1], A, B)
          }
          if (car_intersection){
            intersections.push(car_intersection)
          }
        }
      }
      
      if (left_intersection){intersections.push(left_intersection)}
      if (right_intersection){intersections.push(right_intersection)}
      let touches = intersections.map(e=>e.offset)
      if (touches.length != 0){
        e.active = true;
        e.intersection = intersections[touches.indexOf(Math.min(...touches))]
      }
      else {
        e.active = false;
        e.intersection = null
      }
    })
  }   
}

class Car{
  constructor(){
    // this.x = CANVAS_WIDTH/3;
    this.x = road.getLanCenter(2);
    this.y = 3*CANVAS_HEIGHT/4;
    this.polygon = []
    this.maxSpeed = 3
    this.speed = 0
    this.angle = 0
    this.acceleration = 1
    this.angularAcc = 3
    this.friction = 0.05
    this.angle
    this.flip = 0
  }
  #createpolygon(){
    let rad = this.angle * (Math.PI/180)
    this.polygon = [
      {x: this.x - (-14 * Math.cos(rad) + 28 * Math.sin(rad)), y: this.y - (-14 * Math.sin(rad) - 28 * Math.cos(rad))},
      {x: this.x - (14 * Math.cos(rad) + 28 * Math.sin(rad)), y: this.y - (14 * Math.sin(rad) - 28 * Math.cos(rad))},
      {x: this.x - (-14 * Math.cos(rad) - 28 * Math.sin(rad)), y: this.y - (-14 * Math.sin(rad) + 28 * Math.cos(rad))},
      {x: this.x - (14 * Math.cos(rad) - 28 * Math.sin(rad)), y: this.y - (14 * Math.sin(rad) + 28 * Math.cos(rad))},
      ]
  }
  update(){
    this.x += Math.sin(this.angle * (Math.PI/180)) * this.speed
    this.y -= Math.cos(this.angle * (Math.PI/180)) * this.speed
    this.#createpolygon()
    if (this.speed > this.maxSpeed) {
      this.speed = this.maxSpeed
    }
    if (this.speed < -this.maxSpeed/2) {
      this.speed = -this.maxSpeed/2
    }
  }
}
class TrafficCar extends Car {
  draw(){
    ctx.beginPath()
    ctx.save()
    ctx.translate(this.x, this.y)
    ctx.rotate(this.angle * (Math.PI/180))
    ctx.rect(-14,-28,28,56)
    ctx.fill()
    ctx.restore()
  }
  update(){
    this.speed += this.acceleration
    super.update()
  }
}
class MainCar extends Car {
  constructor(){
    super()
    this.sensors = new Sensors(this)
    this.end = false
    this.maxSpeed = 5
  }
  #checkLaneCollison(){
    let intersections = []
    // lane
    let C = { x:road.borders.left, y: road.borders.top}
    let D = { x:road.borders.left, y: road.borders.bottom}
    let E = { x:road.borders.right, y: road.borders.top}
    let F ={ x:road.borders.right, y: road.borders.bottom}
    for (let i = 0; i < this.polygon.length; i++) {
      let left_intersection;
      let right_intersection;
      if(i==this.polygon.length-1){
        left_intersection = getIntersection(this.polygon[i], this.polygon[0], C, D)
        right_intersection = getIntersection(this.polygon[i], this.polygon[0], E, F)
      }else{
        left_intersection = getIntersection(this.polygon[i], this.polygon[i+1], C, D)
        right_intersection = getIntersection(this.polygon[i], this.polygon[i+1], E, F)
      }
      if (left_intersection){
        intersections.push({type : 'lane', ...left_intersection})
      }
      if (right_intersection){
        intersections.push({type : 'lane', ...right_intersection})
      }
    }
    return intersections;
  }
  #checkTrafficCollison(traffic){
  }
  #checkCollison(traffic){
    let laneIntersections = this.#checkLaneCollison()
    if (laneIntersections.length!=0){
      console.log(laneIntersections)
      this.end=true
    }
    let trafficIntersections = this.#checkTrafficCollison(traffic)
  }
  draw(){
    ctx.beginPath()
    ctx.translate(this.x, this.y)
    ctx.rotate(this.angle * (Math.PI/180))
    ctx.rect(-14,-28,28,56)
    if(this.end){ctx.fillStyle='#000000a4'}
    else{ctx.fillStyle='#000'}
    ctx.fill()
    this.sensors.draw(this.x, this.y, this.angle * (Math.PI/180))
  }
  update(traffic){
    if(this.end){return;}
    this.sensors.listen(this.x, this.y, this.angle * (Math.PI/180), traffic)
    this.#checkCollison(traffic)
    if (controls.forward) {
      this.speed += this.acceleration
    }
    else if (controls.reverse) {
      this.speed -= this.acceleration
    }
    if (controls.forward || controls.reverse){
      if (controls.left) {
      this.angle -= this.angularAcc * this.flip
    }
      else if (controls.right) {
      this.angle += this.angularAcc * this.flip
    }
    }
    if (this.speed > 0){
      this.flip = 1
      this.speed -= this.friction
    }
    if (this.speed < 0){
      this.speed += this.friction
      this.flip = -1
    }
    if (Math.abs(this.speed) <= Math.abs(this.friction)){
      this.speed = 0
    }
    super.update()
  }
}
let main_car = new MainCar()
let traffic = [new TrafficCar()]

let lastTime = new Date().getTime()
const main = () =>{
  window.requestAnimationFrame(main)
  let crntTime = new Date().getTime()
  if ((crntTime - lastTime) >= latency){
    lastTime = crntTime;
    ctx.reset()
    ctx.scale(scale, scale); // scale the drawing context
    ctx.save()
    ctx.translate(0,-main_car.y+CANVAS_HEIGHT*0.7)
    road.draw()
    traffic.forEach(car=>{
      car.draw()
      car.update()
    })
    main_car.draw()
    main_car.update(traffic)
    ctx.restore()
  }
}
main()