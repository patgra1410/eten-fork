const { createCanvas }=require('canvas')
const { inspect }=require('util')
const fs=require('fs')

class Point
{
    constructor(index, x, y, border=false, outside=true)
    {
        this.index=index
        this.x=x
        this.y=y
        this.border=border
        this.outside=outside
        this.edges=[]
    }
}

class Edge
{
    constructor(pointA, pointB, color='#fff')
    {
        this.pointA=pointA
        this.pointB=pointB
        this.color=color
    }
}

module.exports=class Board
{
    constructor(spacing, offsetX, offsetY, uids, usernames, id=0)
    {
        this.spacing=spacing
        this.offsetX=offsetX
        this.offsetY=offsetY
        this.uids=uids
        this.usernames=usernames
        this.id=id

        this.surrender=[[],[]]
        this.remis=[]
        this.turn=0
        this.win=-1
        this.thickness=3
        this.totalMoves=0
        this.longestMove={}
        this.currentMoveLength=0

        var settings=JSON.parse(fs.readFileSync('./data/userSettings.json'))
        this.colors=['#5865f2', '#f04747', '#5865f2', '#f04747']

        for(var i=0; i<this.uids.length; i++)
            if(settings[this.uids[i]]!==undefined && settings[this.uids[i]]['color']!==undefined)
                this.colors[i]=settings[this.uids[i]]['color']

        for(var uid of this.uids)
            this.longestMove[uid]=0

        this.ball=new Point(-1, 6, 6)

        this.canvas=createCanvas(offsetX*2+10*spacing, offsetY*2+10*spacing)
        this.ctx=this.canvas.getContext('2d')

        var points=[]
        var pos=new Array(13)
        for(var i=0; i<pos.length; i++)
            pos[i]=new Array(13)

        var ind=0
        for(var y=0; y<=12; y++)
        {
            for(var x=0; x<=12; x++)
            {
                var outside=false;
                if( (y==1 && 1<=x && x<=4) || (y==1 && 8<=x && x<=11) || (y==11 && 1<=x && x<=4) || (y==11 && 8<=x && x<=11) ||
                    (x==1 && 1<=y && y<=4) || (x==1 && 8<=y && y<=11) || (x==11 && 1<=y && y<=4) || (x==11 && 8<=y && y<=11) ||
                    (x==2 && y==2) || (x==10 && y==2) || (x==2 && y==10) || (x==10 && y==10) || y==0 || y==12 || x==0 || x==12)
                    outside=true
                
                var border=false
                if( (y==2 && 3<=x && x<=5) || (y==2 && 7<=x && x<=9) || (y==10 && 3<=x && x<=5) || (y==10 && 7<=x && x<=9) ||
                    (x==2 && 3<=y && y<=5) || (x==2 && 7<=y && y<=9) || (x==10 && 3<=y && y<=5) || (x==10 && 7<=y && y<=9) ||
                    (y==1 && 5<=x && x<=7) || (y==11 && 5<=x && x<=7) || (x==1 && 5<=y && y<=7) || (x==11 && 5<=y && y<=7) ||
                    (x==3 && y==3) || (x==9 && y==3) || (x==3 && y==9) || (x==9 && y==9) ) 
                    border=true

                pos[x][y]=ind
                points.push(new Point(ind, x, y, border, outside))
                ind++
            }
        }
        this.pos=pos
        this.points=points

        var edges=[] // those loops are so bad
        for(var x of [4, 5, 8, 9])
        {
            for(var y of [2, 10])
            {
                var pointA=new Point(pos[x-1][y], x-1, y)
                var pointB=new Point(pos[x][y], x, y)
                edges.push(new Edge( pointA, pointB ))
                edges.push(new Edge( pointB, pointA ))
            }
        }
        for(var x of [6, 7])
        {
            for(var y of [1, 11])
            {
                var pointA=new Point(pos[x-1][y], x-1, y)
                var pointB=new Point(pos[x][y], x, y)
                edges.push(new Edge( pointA, pointB, (y==1 ? this.colors[1] : this.colors[3]) ))
                edges.push(new Edge( pointB, pointA, (y==1 ? this.colors[1] : this.colors[3]) ))
            }
        }
        for(var y of [4, 5, 8, 9])
        {
            for(var x of [2, 10])
            {
                var pointA=new Point(pos[x][y-1], x, y-1)
                var pointB=new Point(pos[x][y], x, y)
                edges.push(new Edge( pointA, pointB ))
                edges.push(new Edge( pointB, pointA ))
            }
        }
        for(var y of [6, 7])
        {
            for(var x of [1, 11])
            {
                var pointA=new Point(pos[x][y-1], x, y-1)
                var pointB=new Point(pos[x][y], x, y)
                edges.push(new Edge( pointA, pointB, (x==1 ? this.colors[0] : this.colors[2]) ))
                edges.push(new Edge( pointB, pointA, (x==1 ? this.colors[0] : this.colors[2]) ))
            }
        }
        for(var y of [2, 11])
        {
            for(var x of [5, 7])
            {
                var pointA=new Point(pos[x][y-1], x, y-1)
                var pointB=new Point(pos[x][y], x, y)
                edges.push(new Edge( pointA, pointB ))
                edges.push(new Edge( pointB, pointA ))
            }
        }
        for(var y of [3, 10])
        {
            for(var x of [3, 9])
            {
                var pointA=new Point(pos[x][y-1], x, y-1)
                var pointB=new Point(pos[x][y], x, y)
                edges.push(new Edge( pointA, pointB ))
                edges.push(new Edge( pointB, pointA ))
            }
        }
        for(var x of [2, 11])
        {
            for(var y of [5, 7])
            {
                var pointA=new Point(pos[x-1][y], x-1, y)
                var pointB=new Point(pos[x][y], x, y)
                edges.push(new Edge( pointA, pointB ))
                edges.push(new Edge( pointB, pointA ))
            }
        }
        for(var x of [3, 10])
        {
            for(var y of [3, 9])
            {
                var pointA=new Point(pos[x-1][y], x-1, y)
                var pointB=new Point(pos[x][y], x, y)
                edges.push(new Edge( pointA, pointB ))
                edges.push(new Edge( pointB, pointA ))
            }
        }

        this.edges=edges

        var directions=[[-1, -1], [0, -1], [1, -1], [-1, 0], [1, 0], [-1, 1], [0, 1], [1, 1]]
        for(var point of this.points)
        {
            if(!point.border)
                continue
            
            for(var dir of directions)
            {
                var newX=point.x+dir[0]
                var newY=point.y+dir[1]

                if((point.x==newX && this.points[this.pos[newX][newY]].border) || (point.y==newY && this.points[this.pos[newX][newY]].border) || this.points[this.pos[newX][newY]].outside)
                    this.points[this.pos[point.x][point.y]].edges.push(this.pos[newX][newY])
            }

            this.points[this.pos[4][2]].edges.push(this.pos[5][1])
            this.points[this.pos[8][2]].edges.push(this.pos[7][1])
            
            this.points[this.pos[4][10]].edges.push(this.pos[5][11])
            this.points[this.pos[8][10]].edges.push(this.pos[7][11])

            this.points[this.pos[2][4]].edges.push(this.pos[1][5])
            this.points[this.pos[2][8]].edges.push(this.pos[1][7])

            this.points[this.pos[10][4]].edges.push(this.pos[11][5])
            this.points[this.pos[10][8]].edges.push(this.pos[11][7])

            this.points[this.pos[3][2]].edges.push(this.pos[2][3])
            this.points[this.pos[2][3]].edges.push(this.pos[3][2])

            this.points[this.pos[2][9]].edges.push(this.pos[3][10])
            this.points[this.pos[3][10]].edges.push(this.pos[2][9])

            this.points[this.pos[9][2]].edges.push(this.pos[10][3])
            this.points[this.pos[10][3]].edges.push(this.pos[9][2])

            this.points[this.pos[9][10]].edges.push(this.pos[10][9])
            this.points[this.pos[10][9]].edges.push(this.pos[9][10])
        }
    }

    gradient()
    {
        this.ctx.lineWidth=0

        var settings=JSON.parse(fs.readFileSync('./data/userSettings.json'))
        for(var i=0; i<=3; i++)
        {
            var uid=this.uids[i]
            if(settings[uid]['gradient']===undefined)
                return

            if(i==0)
                var grd=this.ctx.createLinearGradient(this.offsetX, this.canvas.height/2, this.canvas.width/2, this.canvas.height/2)
            if(i==1)
                var grd=this.ctx.createLinearGradient(this.canvas.width/2, this.offsetY, this.canvas.width/2, this.canvas.height/2)
            if(i==2)
                var grd=this.ctx.createLinearGradient(this.canvas.width-this.offsetX, this.canvas.height/2, this.canvas.width/2, this.canvas.height/2)
            if(i==3)
                var grd=this.ctx.createLinearGradient(this.canvas.width/2, this.canvas.height-this.offsetY, this.canvas.width/2, this.canvas.height/2)
                
            if(settings[this.uids[i]]['gradient']['special']=='rainbow')
            {
                grd.addColorStop(0, 'red')
                grd.addColorStop(1/6, 'orange')
                grd.addColorStop(2/6, 'yellow')
                grd.addColorStop(3/6, 'green')
                grd.addColorStop(4/6, 'blue')
                grd.addColorStop(5/6, 'violet')
                grd.addColorStop(1, 'rgba(127,0,255,0)')
            }
            else if(settings[this.uids[i]]['gradient']['special']=='random')
            {
                var color=Math.floor(Math.random()*16777215)
                if(color<0)
                    color=0
                if(color>16777215)
                    color=16777215
                grd.addColorStop(0, '#'+color.toString(16))
                grd.addColorStop(1, 'rgba('+Math.floor(Math.random()*255)+', '+Math.floor(Math.random()*255)+', '+Math.floor(Math.random()*255)+', 0)')
            }
            else
            {
                grd.addColorStop(0, settings[this.uids[i]]['gradient']['from'])
                grd.addColorStop(1, settings[this.uids[i]]['gradient']['to'])
            }

            this.ctx.fillStyle=grd
            this.ctx.beginPath()
            if(i==0)
            {
                this.ctx.moveTo(this.offsetX+this.spacing*2, this.offsetY+this.spacing*8)
                this.ctx.lineTo(this.offsetX, this.offsetY+this.spacing*8)
                this.ctx.lineTo(this.offsetX, this.offsetY+this.spacing*2)
                this.ctx.lineTo(this.offsetX+this.spacing*2, this.offsetY+this.spacing*2)
            }
            if(i==1)
            {
                this.ctx.moveTo(this.offsetX+this.spacing*2, this.offsetY+this.spacing*2)
                this.ctx.lineTo(this.offsetX+this.spacing*2, this.offsetY)
                this.ctx.lineTo(this.offsetX+this.spacing*8, this.offsetY)
                this.ctx.lineTo(this.offsetX+this.spacing*8, this.offsetY+this.spacing*2)
            }
            if(i==2)
            {
                this.ctx.moveTo(this.offsetX+this.spacing*8, this.offsetY+this.spacing*2)
                this.ctx.lineTo(this.offsetX+this.spacing*10, this.offsetY+this.spacing*2)
                this.ctx.lineTo(this.offsetX+this.spacing*10, this.offsetY+this.spacing*8)
                this.ctx.lineTo(this.offsetX+this.spacing*8, this.offsetY+this.spacing*8)
            }
            if(i==3)
            {
                this.ctx.moveTo(this.offsetX+this.spacing*8, this.offsetY+this.spacing*8)
                this.ctx.lineTo(this.offsetX+this.spacing*8, this.offsetY+this.spacing*10)
                this.ctx.lineTo(this.offsetX+this.spacing*2, this.offsetY+this.spacing*10)
                this.ctx.lineTo(this.offsetX+this.spacing*2, this.offsetY+this.spacing*8)
            }

            this.ctx.lineTo(this.canvas.width/2, this.canvas.height/2)
            this.ctx.closePath()
            this.ctx.fill()

            this.ctx.clearRect(this.offsetX, this.offsetY+2*this.spacing, this.spacing, 2*this.spacing)
            this.ctx.clearRect(this.offsetX, this.offsetY+6*this.spacing, this.spacing, 2*this.spacing)

            this.ctx.clearRect(this.offsetX+2*this.spacing, this.offsetY, 2*this.spacing, this.spacing)
            this.ctx.clearRect(this.offsetX+6*this.spacing, this.offsetY, 2*this.spacing, this.spacing)

            this.ctx.clearRect(this.offsetX+9*this.spacing, this.offsetY+2*this.spacing, this.spacing, 2*this.spacing)
            this.ctx.clearRect(this.offsetX+9*this.spacing, this.offsetY+6*this.spacing, this.spacing, 2*this.spacing)

            this.ctx.clearRect(this.offsetX+2*this.spacing, this.offsetY+9*this.spacing, 2*this.spacing, this.spacing)
            this.ctx.clearRect(this.offsetX+6*this.spacing, this.offsetY+9*this.spacing, 2*this.spacing, this.spacing)
        }
    }

    draw(paintGradient=true)
    {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height)

        if(paintGradient)
            this.gradient()

        this.ctx.textAlign='center'
        this.ctx.font='30px Arial'
        this.ctx.lineWidth=this.thickness


        this.ctx.save()
        this.ctx.translate(this.offsetX-this.offsetX/2+10, this.canvas.height/2)
        this.ctx.rotate(-Math.PI/2)
        this.ctx.fillStyle=this.colors[0]
        this.ctx.fillText(this.usernames[0], 0, 0)
        this.ctx.restore()

        this.ctx.save()
        this.ctx.translate(this.canvas.width/2, this.offsetY-this.offsetY/2+10)
        this.ctx.fillStyle=this.colors[1]
        this.ctx.fillText(this.usernames[1], 0, 0)
        this.ctx.restore()

        this.ctx.save()
        this.ctx.translate(this.canvas.width-this.offsetX/2-10, this.canvas.height/2)
        this.ctx.rotate(+Math.PI/2)
        this.ctx.fillStyle=this.colors[2]
        this.ctx.fillText(this.usernames[2], 0, 0)
        this.ctx.restore()

        this.ctx.save()
        this.ctx.translate(this.canvas.width/2, this.canvas.height-this.offsetY/2-10)
        this.ctx.rotate(Math.PI)
        this.ctx.fillStyle=this.colors[3]
        this.ctx.fillText(this.usernames[3], 0, 0)
        this.ctx.restore()

        this.ctx.fillStyle='#fff'
        for(var point of this.points)
        {
            if(point.outside)
                continue

            this.ctx.fillRect(this.offsetX+this.spacing*(point.x-1)-this.thickness/2, this.offsetY+this.spacing*(point.y-1)-this.thickness/2, this.thickness, this.thickness)
        }

        for(var edge of this.edges)
        {
            this.ctx.strokeStyle=edge.color
            this.ctx.beginPath()
            this.ctx.moveTo(this.offsetX+this.spacing*(edge.pointA.x-1), this.offsetY+this.spacing*(edge.pointA.y-1))
            this.ctx.lineTo(this.offsetX+this.spacing*(edge.pointB.x-1), this.offsetY+this.spacing*(edge.pointB.y-1))
            this.ctx.stroke()
        }

        this.ctx.strokeStyle=this.colors[this.turn]
        this.ctx.fillStyle=this.colors[this.turn]

        this.ctx.beginPath()
        this.ctx.arc(this.offsetX+this.spacing*(this.ball.x-1), this.offsetY+this.spacing*(this.ball.y-1), 5, 0, 2*Math.PI, false)
        this.ctx.fill()
        this.ctx.stroke()

        var data=this.canvas.toDataURL().replace(/^data:image\/\w+;base64,/, "")
        var buf=Buffer.from(data, "base64")
        fs.writeFileSync('data/boardTeamPilkarzyki'+this.id+'.png', buf)
    }

    possibleMoveIndexes(x, y)
    {
        if(x==undefined)
            x=this.ball.x
        if(y==undefined)
            y=this.ball.y
            
        var moves=[]
        var directions=[[-1, -1], [0, -1], [1, -1], [-1, 0], [1, 0], [-1, 1], [0, 1], [1, 1]]

        for(var i=0; i<directions.length; i++)
        {
            var dir=directions[i]
            if(!this.points[ this.pos[x][y] ].edges.includes( this.pos[ x+dir[0] ][ y+dir[1] ] ))
                moves.push(i)
        }

        return moves
    }

    possibleMoves(x, y)
    {
        if(x==undefined)
            x=this.ball.x
        if(y==undefined)
            y=this.ball.y

        var indexes=this.possibleMoveIndexes(x, y)
        var moves=[]
        var directions=[[-1, -1], [0, -1], [1, -1], [-1, 0], [1, 0], [-1, 1], [0, 1], [1, 1]]

        for(var index of indexes)
            moves.push(this.pos[ x+directions[index][0] ][ y+directions[index][1] ])

        return moves
    }

    move(index)
    {
        var moves=this.possibleMoves()
        if(index>=moves.length || this.win!=-1)
            return false

        this.points[this.pos[this.ball.x][this.ball.y]].edges.push(moves[index])
        this.points[moves[index]].edges.push(this.pos[this.ball.x][this.ball.y])
        if(this.turn%2==0)
            this.edges.push( new Edge(this.points[moves[index]], this.points[this.pos[this.ball.x][this.ball.y]], this.colors[this.turn]) )
        else
           this.edges.push( new Edge(this.points[moves[index]], this.points[this.pos[this.ball.x][this.ball.y]], this.colors[this.turn]) )

        this.totalMoves++

        var point=this.points[moves[index]]   
        this.ball.x=point.x
        this.ball.y=point.y

        if(this.ball.x==1 || this.ball.x==11)
            this.win=1
        if(this.ball.y==1 || this.ball.y==11)
            this.win=0

        if(this.points[moves[index]].edges.length==1)
            this.turn=(this.turn+1)%4
        if(this.points[moves[index]].edges.length==8)
            this.win=(this.turn+1)%2

        return true
    }

    turnUID()
    {
        return this.uids[this.turn]
    }

    removeBoard()
    {
        try {
            fs.unlinkSync('./data/boardTeamPilkarzyki'+this.id+'.png')
        } catch(error) {
            console.log(error)
        }
    }

    dump(i)
    {
        fs.writeFileSync('./data/boardTeamPilkarzyki'+i+'.dump', inspect(this, {depth: 10}))
    }
}