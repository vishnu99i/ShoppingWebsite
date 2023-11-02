var db = require('../config/connection')
var collection = require('../config/collections')

module.exports = {
   addProduct : (product,callback) => {
      console.log(product);
      db.get().collection('product').insertOne(product).then((data) => {
         console.log(data)//ops array
         callback(data.ops[0]._id)
      })
   },
   
   //Taking datas from database
   getAllProducts:() => {
      return new Promise(async(resolve,reject) => {
         let products = await db.get().collection(collection.PRODUCT_COLLECTION).find().toArray()
         resolve(products)
      })
   }
}