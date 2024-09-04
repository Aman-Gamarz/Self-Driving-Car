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


/****************************************
 =============== NETWORK =============== 
 ***************************************/

class MathFunc{}
class Layer{
  constructor(inputCount, outputCount){
    this.activations = new Array(outputCount)
    this.biases = new Array(outputCount)
    this.weights = new Array(outputCount)
    for (let i = 0; i < outputCount; i++) {
      this.biases[i] = Math.random()*2-1
      this.weights[i] = new Array(inputCount)
    }
    for (let i = 0; i < outputCount; i++) {
      for (let j = 0; j < inputCount; j++) {
        this.weights[i][j] = Math.random()*2-1;
      }
    }
  }
  static feedforward(inputs, level){
    for (let i = 0; i < level.activations.length; i++) {
      let sum = 0;
      for (let j = 0; j < level.weights[i].length; j++) {
        sum += level.weights[i][j]*inputs[j]
      }
      if (sum>level.biases[i]) {
        level.activations[i] = 1
      }else{
        level.activations[i] = 0
      }
    }
    return level.activations;
  }
}
class Network{
  // 5,6,6,4
  constructor(shape, mutationIndex, parentNetwork){
    this.layer = []
    for (let i = 0; i < shape.length - 1; i++) {
      this.layer.push(new Layer(shape[i], shape[i+1]))
    }
    let cachedLayer = JSON.parse(localStorage.getItem("car_network"))
    if(cachedLayer && parentNetwork == undefined){
      this.layer = cachedLayer.layer
    }
    if(parentNetwork != undefined){
      this.layer = parentNetwork.layer
    }
    for (let i = 0; i < this.layer.length; i++) {
        for (let j = 0; j < this.layer[i].biases.length; j++) {
          this.layer[i].biases[j] = lerp(
            this.layer[i].biases[j],
            Math.random()*2-1,
            mutationIndex,
            )
        }
      }
    for (let i = 0; i < this.layer.length; i++) {
        for (let j = 0; j < this.layer[i].weights.length; j++) {
          for (let k = 0; k < this.layer[i].weights[j].length; k++) {
          this.layer[i].weights[j][k] = lerp(
            this.layer[i].weights[j][k],
            Math.random()*2-1,
            mutationIndex,
            )
        }
      }
    }
  }
  
  feedforward(input){
    let output = Layer.feedforward(input, this.layer[0])
    for (let i = 1; i < this.layer.length; i++) {
      output = Layer.feedforward(output, this.layer[i])
    }
    return output
  }
}
const save = () =>{
  let bestCarIndex = main_cars.map(e=>e.y).indexOf(Math.min(...main_cars.map(e=>e.y)))
  localStorage.setItem('car_network', JSON.stringify(main_cars[bestCarIndex].brain))
}

/***************************************/

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
    this.laneCount = 4
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

const segmentIntersection = (A,B,C,D) =>{ 
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
const segPolyIntersection = (segment, polygon, all) => {
  let intersections = [];
  for (let i = 0; i < polygon.length; i++) {
    let touch = segmentIntersection(segment[0], segment[1], polygon[i], polygon[(i+1)%polygon.length])
    if (touch){
      intersections.push(touch)
    }
  }
  if(intersections.length !=0 && all){
    return intersections
  }
  if (intersections.length != 0 && !all){
    let touches = intersections.map(e=>e.offset)
    return intersections[touches.indexOf(Math.min(...touches))];
  }
  return null;
}
const polyIntersection = (p1, p2) => {
  let intersections = []
  for (let i = 0; i < p1.length; i++) {
    let touch = segPolyIntersection([p1[i], p1[(i+1)%p1.length]], p2, true)
    if (touch){
      for (let i of touch){
        intersections.push(i)
      }
    }
  }
  if(intersections.length != 0){
    let touches = intersections.map(e=>e.offset)
    return intersections[touches.indexOf(Math.min(...touches))]
  }
  return null
}

class Sensors{
  constructor(car){
    this.car = car
    this.sensorCount = 5
    this.sectorAngle = 7*Math.PI/18
    this.sensorRange = 200
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
  }
  draw(carX, carY, angle){
    this.sensors.forEach((e, index)=>{
      ctx.beginPath()
      ctx.lineWidth = 2
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
      let left_intersection = segmentIntersection(B, A,C,D)
      let right_intersection = segmentIntersection(B,A,E,F)
      if (left_intersection){intersections.push(left_intersection)}
      if (right_intersection){intersections.push(right_intersection)}
      
      // with traffic
      for (let i = 0; i < traffic.length; i++) {
        let touch = segPolyIntersection([B, A], traffic[i].polygon, true)
        if (touch){
          for (let i of touch){
          intersections.push(i)}
        }
      }
      if (intersections.length != 0){
        let touches = intersections.map(e=>e.offset)
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
  update(){
    this.x += Math.sin(this.angle * (Math.PI/180)) * this.speed
    this.y -= Math.cos(this.angle * (Math.PI/180)) * this.speed
    if (this.speed > this.maxSpeed) {
      this.speed = this.maxSpeed
    }
    if (this.speed < -this.maxSpeed/2) {
      this.speed = -this.maxSpeed/2
    }
  }
}

class TrafficCar extends Car {
  constructor(x, y){
    super()
    this.x = x;
    this.y = y;
  }
  #createpolygon(){
    this.polygon=[
        {x: this.x - 14, y: this.y - 28},
        {x: this.x + 14, y: this.y - 28},
        {x: this.x + 14, y: this.y + 28},
        {x: this.x - 14, y: this.y + 28}
      ]
  }
  draw(){
    ctx.beginPath()
    ctx.save()
    ctx.translate(this.x, this.y)
    ctx.rect(-14,-28,28,56)
    ctx.fill()
    ctx.restore()
  }
  update(){
    this.speed += this.acceleration
    this.#createpolygon()
    super.update()
  }
}
class MainCar extends Car {
  constructor(parentNetwork){
    super()
    this.sensors = new Sensors(this)
    this.brain = new Network([this.sensors.sensorCount,6,4], 0.1, parentNetwork)
    this.end = false
    this.mode = 'AI'
    this.maxSpeed = 5
    this.x = road.getLanCenter(1);
    this.y = 3*CANVAS_HEIGHT/4;
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
  #checkLaneCollison(){
    // lane
    let C = { x:road.borders.left, y: road.borders.top}
    let D = { x:road.borders.left, y: road.borders.bottom}
    let E = { x:road.borders.right, y: road.borders.top}
    let F ={ x:road.borders.right, y: road.borders.bottom}
    for (let i = 0; i < this.polygon.length; i++) {
      let left_intersection;
      let right_intersection;
      if(i==this.polygon.length-1){
        left_intersection = segmentIntersection(this.polygon[i], this.polygon[0], C, D)
        right_intersection = segmentIntersection(this.polygon[i], this.polygon[0], E, F)
      }else{
        left_intersection = segmentIntersection(this.polygon[i], this.polygon[i+1], C, D)
        right_intersection = segmentIntersection(this.polygon[i], this.polygon[i+1], E, F)
      }
      if (left_intersection || right_intersection){
        return true
      }
    }
    return false;
  }
  #checkTrafficCollison(traffic){
    for (let i = 0; i < traffic.length; i++) {
      let touch = polyIntersection(this.polygon, traffic[i].polygon)
      if (touch){
        return true
      }
    }
    return false
  }
  #checkCollison(traffic){
    let laneIntersections = this.#checkLaneCollison()
    let trafficIntersections = this.#checkTrafficCollison(traffic)
    if (laneIntersections || trafficIntersections){
      this.end=true
    }
  }
  draw(best){
    ctx.beginPath()
    ctx.save()
    ctx.translate(this.x, this.y)
    ctx.rotate(this.angle * (Math.PI/180))
    ctx.rect(-14,-28,28,56)
    if(this.end){ctx.fillStyle='#000000a4'}
    else{
      ctx.fillStyle='#00f'
    }
    ctx.fill()
    if(best){
      this.sensors.draw(this.x, this.y, this.angle * (Math.PI/180))
    }
    ctx.restore()
  }
  update(traffic){
    if(this.end || this.#checkCollison(traffic)){return;}
    super.update()
    this.#createpolygon()
    this.sensors.listen(this.x, this.y, this.angle * (Math.PI/180), traffic)
    
    
    let activations = this.sensors.sensors.map(e=>{
      if(e.active){
        return 1 - e.intersection.offset
      }
      return 0
    })
    let direction = this.brain.feedforward(activations)
    if(this.mode=='AI'){
     if (direction[0]) {
      this.speed += this.acceleration
    }
      else if (direction[1]) {
      this.speed -= this.acceleration
    }
      if (direction[0] || direction[1]){
      if (direction[2]) {
      this.angle -= this.angularAcc * this.flip
    }
      else if (direction[3]) {
      this.angle += this.angularAcc * this.flip
    }
    }
    } else{
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
  }
}
let patchCount = 100;
let main_cars = []
for (let i = 0; i < patchCount; i++) {
  main_cars.push(new MainCar())
}
let traffic = [
  new TrafficCar(road.getLanCenter(1), 1*CANVAS_HEIGHT/3),
  new TrafficCar(road.getLanCenter(0), 0*CANVAS_HEIGHT/3),
  new TrafficCar(road.getLanCenter(2), -1*CANVAS_HEIGHT/3),
  new TrafficCar(road.getLanCenter(1), -2*CANVAS_HEIGHT/3),
  new TrafficCar(road.getLanCenter(0), -2*CANVAS_HEIGHT/3),
  new TrafficCar(road.getLanCenter(0), -3*CANVAS_HEIGHT/3),
  new TrafficCar(road.getLanCenter(1), -3*CANVAS_HEIGHT/3),
]
let carExtend = -3
let lastTime = new Date().getTime()
window.setInterval(function() {
    let bestCar= main_cars[main_cars.map(e=>e.y).indexOf(Math.min(...main_cars.map(e=>e.y)))]
    if(!bestCar.end){
      for (let i = 0; i < patchCount/5; i++) {
        let newCar =  new MainCar()
        newCar.x=bestCar.x
        newCar.y=bestCar.y
        main_cars.push(newCar)
      }
    }
}, 2000);

const main = () =>{
  window.requestAnimationFrame(main)
  let crntTime = new Date().getTime()
  if ((crntTime - lastTime) >= latency){
    lastTime = crntTime;
    let bestCarIndex = main_cars.map(e=>e.y).indexOf(Math.min(...main_cars.map(e=>e.y)))
    ctx.reset()
    ctx.scale(scale, scale); // scale the drawing context
    ctx.save()
    ctx.translate(0,-main_cars[bestCarIndex].y+CANVAS_HEIGHT*0.7)
    road.draw()
    let indices = []
    traffic.forEach((car, index)=>{
      car.update()
      car.draw()
      if(car.y - main_cars[bestCarIndex].y > 300){
        indices.push(index)
      }
    })
    let temp = false
    for (let i of indices){
      traffic[i] = new TrafficCar(road.getLanCenter(Math.round(Math.random()*3)), main_cars[bestCarIndex].y-300)
      if (temp || Boolean(Math.round(Math.random()))){
        temp = false
      }else{
        temp=true
      }
    }
    ctx.globalAlpha = 0.4
    main_cars.forEach((car, index)=>{
      car.update(traffic)
      car.draw()
      if(car.end){
        main_cars[index] = null
      }
    })
    ctx.globalAlpha = 1
    main_cars = main_cars.filter(car=>{
      if (car!=null){
        return car
      }
    })
    bestCarIndex = main_cars.map(e=>e.y).indexOf(Math.min(...main_cars.map(e=>e.y)))
    main_cars[bestCarIndex].draw(true)
    ctx.restore()
  }
}
main()