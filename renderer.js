const { createCanvas }=require('canvas')
const readline=require('readline')
const { inspect }=require('util')
const fs=require('fs')

class Point
{
    constructor(index, x, y, border=false, outside=false)
    {
        this.index=index
        this.x=x
        this.y=y
        this.border=border
        this.outside=outside
        this.edges=[]

        this.end=false
    }
}

class Edge
{
    constructor(index, pointA, pointB)
    {
        this.index=index
        this.pointA=pointA
        this.pointB=pointB
    }
}

module.exports=class Board
{
    constructor(spacing, offsetX, offsetY, uids, usernames)
    {
        this.remis=[]
        this.usernames=usernames
        this.uids=uids
        this.turn=0
        this.win=-1
        this.thickness=3
        this.blue='#5865f2'
        this.red='#f04747'

        this.spacing=spacing
        this.offsetX=offsetX
        this.offsetY=offsetY

        this.ball=new Point(-1, 6, 4)
        
        this.canvas=createCanvas(offsetX*2+10*spacing,offsetY*2+spacing*6)
        this.ctx=this.canvas.getContext('2d')

        var points=[]
        var pos=Array(13)
        for(var i=0; i<pos.length; i++)
            pos[i]=new Array(9)
        
        var ind=0
        for(var y=0; y<=8; y++)
        {
            for(var x=0; x<=12; x++)
            {
                var outside=false;
                if((x==1 || x==11) && (y==1 || y==2 || y==6 || y==7))
                    outside=true;
                if(y==0 || y==8 || x==0 || x==12)
                    outside=true;
                var border=false;
                if((y==1 || y==7) && 2<=x && x<=10)
                    border=true
                if((x==1 || x==11) && 3<=y && y<=5)
                    border=true
                if((x==2 || x==10) && ((1<=y && y<=3) || (5<=y && y<=7)))
                    border=true
                
                pos[x][y]=ind
                points.push(new Point(ind, x, y, border, outside))
                ind++
            }
        }
        this.pos=pos
        this.points=points
        
        ind=0
        var edges=[]
        for(var x=3; x<=10; x++)
        {
            edges.push(new Edge(ind, new Point(pos[x][1], x, 1, true), new Point(pos[x-1][1], x-1, 1, true)))
            ind++
            edges.push(new Edge(ind, new Point(pos[x][7], x, 7, true), new Point(pos[x-1][7], x-1, 7, true)))
            ind++
        }
        for(var y=2; y<=7; y++)
        {
            edges.push(new Edge((4<=y && y<=5 ? -3 : ind), new Point((4<=y && y<=5 ? pos[1][y] : pos[2][y]), (4<=y && y<=5 ? 1 : 2), y, true), new Point((4<=y && y<=5 ? pos[1][y-1] : pos[2][y-1]), (4<=y && y<=5 ? 1 : 2), y-1, true)))
            ind++
            edges.push(new Edge((4<=y && y<=5 ? -2 : ind), new Point((4<=y && y<=5 ? pos[11][y] : pos[10][y]), (4<=y && y<=5 ? 11 : 10), y, true), new Point((4<=y && y<=5 ? pos[11][y-1] : pos[10][y-1]), (4<=y && y<=5 ? 11 : 10), y-1, true)))
            ind++
        }
        edges.push(new Edge(ind, new Point(pos[1][3], 1, 3, true), new Point(pos[2][3], 2, 3, true)))
        ind++
        edges.push(new Edge(ind, new Point(pos[1][5], 1, 5, true), new Point(pos[2][5], 2, 5, true)))
        ind++
        edges.push(new Edge(ind, new Point(pos[10][3], 10, 3, true), new Point(pos[11][3], 11, 3, true)))
        ind++
        edges.push(new Edge(ind, new Point(pos[10][5], 10, 5, true), new Point(pos[11][5], 11, 5, true)))

        this.edges=edges
        
        var directions=[[-1, -1], [0, -1], [1, -1], [-1, 0], [1, 0], [-1, 1], [0, 1], [1, 1]]
        for(var i in this.points)
        {
            var point=this.points[i]
            
            if(!point.border)
                continue

            for(var j in directions)
            {
                var dir=directions[j]
                var newX=point.x+dir[0]
                var newY=point.y+dir[1]

                if((newX==point.x && this.points[pos[newX][newY]].border) || (newY==point.y && this.points[pos[newX][newY]].border) || this.points[pos[newX][newY]].outside)
                    this.points[i].edges.push(pos[newX][newY])
            }
        }
        this.points[pos[2][2]].edges.push(pos[1][3])
        this.points[pos[2][6]].edges.push(pos[1][5])
        this.points[pos[10][2]].edges.push(pos[11][3])
        this.points[pos[10][6]].edges.push(pos[11][5])
    }

    draw() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height)
        
        // this.ctx.fillStyle='#36393f'
        // this.ctx.fillRect(0,0,this.canvas.width, this.canvas.height)
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
        this.ctx.translate(this.offsetX*11+this.offsetX/2-10, this.canvas.height/2)
        this.ctx.rotate(+Math.PI/2)
        this.ctx.fillStyle=this.red
        this.ctx.fillText(this.usernames[1], 0, 0)
        this.ctx.restore()

        this.ctx.fillStyle='#fff'
        for(var i in this.points)
        {
            var point=this.points[i]
            if(point.outside)
                continue
            this.ctx.fillRect(this.offsetX+this.spacing*(point.x-1)-this.thickness/2, this.offsetY+this.spacing*(point.y-1)-this.thickness/2, this.thickness, this.thickness)
        }
        
        this.ctx.strokeStyle='#fff'
        for(var i in this.edges)
        {
            var edge=this.edges[i]
            
            if(edge.index==-3)
                this.ctx.strokeStyle=this.blue
            else if(edge.index==-2)
                this.ctx.strokeStyle=this.red
            else
                this.ctx.strokeStyle='#fff'

            this.ctx.beginPath()
            this.ctx.moveTo(this.offsetX+this.spacing*(edge.pointA.x-1), this.offsetY+this.spacing*(edge.pointA.y-1))
            this.ctx.lineTo(this.offsetX+this.spacing*(edge.pointB.x-1), this.offsetY+this.spacing*(edge.pointB.y-1))
            this.ctx.stroke()
        }

        if(this.turn==0)
        {
            this.ctx.strokeStyle=this.blue
            this.ctx.fillStyle=this.blue
        }
        else if(this.turn==1)
        {
            this.ctx.strokeStyle=this.red
            this.ctx.fillStyle=this.red
        }
        else
        {
            this.ctx.strokeStyle='#fff'
            this.ctx.fillStyle='#fff'
        }
        this.ctx.beginPath()
        this.ctx.arc(this.offsetX+this.spacing*(this.ball.x-1), this.offsetY+this.spacing*(this.ball.y-1), 5, 0, 2*Math.PI, false)
        this.ctx.fill()
        this.ctx.stroke()

        var data=this.canvas.toDataURL().replace(/^data:image\/\w+;base64,/, "")
        var buf=Buffer.from(data, "base64")
        fs.writeFileSync("data/board.png", buf)
    }

    possibleMovesIndexes(x, y)
    {
        if(x===undefined && y===undefined)
        {
            x=this.ball.x
            y=this.ball.y
        }

        var moves=[]
        var directions=[[-1, -1], [0, -1], [1, -1], [-1, 0], [1, 0], [-1, 1], [0, 1], [1, 1]]

        for(var i=0; i<directions.length; i++)
        {
            var dir=directions[i]
            if(!this.points[this.pos[x][y]].edges.includes(this.pos[ x+dir[0] ][ y+dir[1] ]))
                moves.push(i)
        }

        return moves
    }

    possibleMoves(x, y)
    {
        if(x===undefined && y===undefined)
        {
            x=this.ball.x
            y=this.ball.y
        }

        var indexes=this.possibleMovesIndexes(x, y)
        var moves=[]
        var directions=[[-1, -1], [0, -1], [1, -1], [-1, 0], [1, 0], [-1, 1], [0, 1], [1, 1]]

        for(var i=0; i<indexes.length; i++)
        {
            var index=indexes[i]
            moves.push(this.pos[ x+directions[index][0] ][ y+directions[index][1] ])
        }

        // for(var i in directions)
        // {
        //     var dir=directions[i]
        //     if(!this.points[this.pos[x][y]].edges.includes(this.pos[ x+dir[0] ][ y+dir[1] ]))
        //     {
        //         moves.push(this.pos[ x+dir[0] ][ y+dir[1] ])
        //     }
        // }

        return moves
    }

    dump(i)
    {
        fs.writeFileSync('./data/board'+i+'.dump', inspect(this, {depth: 10}))
    }

    move(index)
    {
        var moves=this.possibleMoves()
        
        if(index>=moves.length || this.win!=-1)
            return false

        this.points[this.pos[this.ball.x][this.ball.y]].edges.push(moves[index])
        this.points[moves[index]].edges.push(this.pos[this.ball.x][this.ball.y])
        this.edges.push(new Edge(-3+this.turn, this.points[moves[index]], this.points[this.pos[this.ball.x][this.ball.y]]))

        var point=this.points[moves[index]]
        this.ball.x=point.x
        this.ball.y=point.y

        if(this.ball.x==1)
            this.win=1
        if(this.ball.x==11)
            this.win=0
        
        if(this.points[moves[index]].edges.length==1)
            this.turn=(this.turn+1)%2

        if(this.points[moves[index]].edges.length==8)
            this.win=(this.turn+1)%2

        return true
    }

    turnUID()
    {
        return this.uids[this.turn]
    }
}

// board=new Board(50, 50, 50)