'use strict'

const Board = require('../pilkarzykiRenderer.js')
const ExtBoard = require('../bot.js')
const fs = require('fs')
const process = require('process')

const evalFunctions = fs.readdirSync('./evaluationFunctions').filter(file => file.endsWith('.js'))

for (var func of evalFunctions)
{
    var evalFunc = require('../evaluationFunctions/'+func)
    console.log('Function:', evalFunc.name)

    process.stdout.write('\tNo possible moves board: \t')
    var b = new Board(50, 50, 50, [1,1], ['a', 'b'], 0, true)
    var extboard = new ExtBoard(b, 9, 13, evalFunc)

    extboard.graph[5][3] = [true, true, true, true, true, true, true, false]
    extboard.graph[6][3] = [true, true, true, true, true, true, false, true]
    extboard.graph[7][3] = [true, true, true, true, true, false, true, true]
    extboard.graph[5][4] = [true, true, true, true, false, true, true, true]
    extboard.graph[7][4] = [true, true, true, false, true, true, true, true]
    extboard.graph[5][5] = [true, true, false, true, true, true, true, true]
    extboard.graph[6][5] = [true, false, true, true, true, true, true, true]
    extboard.graph[7][5] = [false, true, true, true, true, true, true, true]

    var moves = extboard.search(4, 0, -2000, 2000)
    if (moves[1].length==0)
        console.log('\x1b[42m\x1b[30mOK\x1b[0m')
    else
    {
        console.log('\x1b[41mERROR\x1b[0m')
        console.log('Moves:', moves)
        process.exit(-1)
    }

    process.stdout.write('\tCheckmate in one: \t\t')

    extboard = new ExtBoard(b, 9, 13, evalFunc)
    extboard.ball = [9, 4]

    moves = extboard.search(4, 0, -2000, 2000)[1]
    b.ball.x = 9
    b.ball.y = 4
    
    for (var dir of moves)
    {
        var ind = b.possibleMovesIndexes()
        if (!b.move(ind.indexOf(dir)))
        {
            console.log('\x1b[41mERROR\x1b[0m')
            console.log('Moves:', moves)
            process.exit(-1)
        }
    }
    if(b.win!=0)
    {
        console.log('\x1b[41mERROR\x1b[0m')
        console.log('Moves:', moves)
        process.exit(-1)
    }
    console.log('\x1b[42m\x1b[30mOK\x1b[0m')

    process.stdout.write('\tOne move away from left goal: \t')

    extboard = new ExtBoard(b, 9, 13, evalFunc)
    b = new Board(50, 50, 50, [1,1], ['a', 'b'], 0, true)
    extboard.ball = [3, 4]

    moves = extboard.search(4, 0, -2000, 2000)[1]
    b.ball.x = 3
    b.ball.y = 4
    
    for (var dir of moves)
    {
        var ind = b.possibleMovesIndexes()
        if (!b.move(ind.indexOf(dir)))
        {
            console.log('\x1b[41mERROR\x1b[0m')
            console.log('Illegal moves:', moves)
            process.exit(-1)
        }
    }
    if(b.win!=-1)
    {
        console.log('\x1b[41mERROR\x1b[0m')
        console.log('Someone won. Moves:', moves)
        process.exit(-1)
    }
    console.log('\x1b[42m\x1b[30mOK\x1b[0m')
}