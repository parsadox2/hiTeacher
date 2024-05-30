function setAi(obj)
{
    let count = 1
    if(obj.length)
    {
        count = obj[0]._id +1
    }
    return count
}
export {setAi}