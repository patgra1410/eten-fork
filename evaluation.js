module.exports=function (position) {
    // right goal
    if (position[0] == 11) {
        return 1000
    }
    // left goal
    if (position[0] == 1) {
        return -1000
    }

    // very poor evaluation...
    // TODO: make it not poor

    return (position[0] - 6)*(position[0] - 6)
}