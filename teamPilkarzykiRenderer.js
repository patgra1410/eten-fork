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
        this.blue='#5865f2'
        this.red='#f04747'

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
                    (x==2 && 3<=y && y<=5) || (x==2 && 7<=y && y<=9) || (x==10 && 3<=y && y<=5) || (x==10 && 3<=y && y<=5) ||
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
                edges.push(new Edge( pointA, pointB, this.red ))
                edges.push(new Edge( pointB, pointA, this.red ))
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
                edges.push(new Edge( pointA, pointB, this.blue ))
                edges.push(new Edge( pointB, pointA, this.blue ))
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

    draw()
    {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height)

        this.ctx.textAlign='center'
        this.ctx.font='30px Arial'
        this.ctx.lineWidth=this.thickness

        this.ctx.save()
        this.ctx.translate(this.offsetX-this.offsetX/2+10, this.canvas.height/2)
        this.ctx.rotate(-Math.PI/2)
        this.ctx.fillStyle=this.blue
        this.ctx.fillText(this.usernames[0], 0, 0)
        this.ctx.restore()

        this.ctx.save()
        this.ctx.translate(this.canvas.width/2, this.offsetY-this.offsetY/2+10)
        this.ctx.fillStyle=this.red
        this.ctx.fillText(this.usernames[1], 0, 0)
        this.ctx.restore()

        this.ctx.save()
        this.ctx.translate(this.canvas.width-this.offsetX/2-10, this.canvas.height/2)
        this.ctx.rotate(+Math.PI/2)
        this.ctx.fillStyle=this.blue
        this.ctx.fillText(this.usernames[2], 0, 0)
        this.ctx.restore()

        this.ctx.save()
        this.ctx.translate(this.canvas.width/2, this.canvas.height-this.offsetY/2-10)
        this.ctx.rotate(Math.PI)
        this.ctx.fillStyle=this.red
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

        if(this.turn%2==0)
        {
            this.ctx.strokeStyle=this.blue
            this.ctx.fillStyle=this.blue
        }
        else
        {
            
            this.ctx.strokeStyle=this.red
            this.ctx.fillStyle=this.red
        }

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
            this.edges.push( new Edge(this.points[moves[index]], this.points[this.pos[this.ball.x][this.ball.y]], this.blue) )
        else
           this.edges.push( new Edge(this.points[moves[index]], this.points[this.pos[this.ball.x][this.ball.y]], this.red) )

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

    dump(i)
    {
        fs.writeFileSync('./data/boardPilkarzyki'+i+'.dump', inspect(this, {depth: 10}))
    }
}