var db = require('../config/connection')
var collection = require('../config/collections')
const bcrypt = require('bcrypt')
var objectId = require('mongodb').ObjectID

module.exports = {
   doSignup: (userData) => {
      return new Promise(async(resolve,reject) => {
         userData.Password = await bcrypt.hash(userData.Password,10)
         db.get().collection(collection.USER_COLLECTION).insertOne(userData).then((data) => {
            resolve(data.ops[0])
         })
      })
   },
   doLogin:(userData) => {
      return new Promise(async(resolve,reject) => {
         let loginStatus = false
         let response = {}
         let user = await db.get().collection(collection.USER_COLLECTION).findOne({Email:userData.Email})
         if(user){
            bcrypt.compare(userData.Password,user.Password).then((status) => {
               if(status){
                  console.log("Login success")
                  response.user = user
                  response.status = true
                  resolve(response)
               }
               else{
                  console.log("Login failed")
                  resolve({status:false})
               }
            })
         }
         else{
            console.log("Login failed")
            resolve({status: false})
         }
      })
   },
   addToCart: (proId,userId) => {

      let proObj = {
         item:objectId(proId),
         quantity:1
      }

      return new Promise(async (resolve,reject) => {
         let userCart = await db.get().collection(collection.CART_COLLECTION).findOne({user:objectId(userId)})
         if(userCart){

            let proExist = userCart.products.findIndex(product => product.item == proId)
            console.log(proExist)

            if(proExist != -1){
               db.get().collection(collection.CART_COLLECTION)
               .updateOne({user:objectId(userId),'products.item' : objectId(proId)},
               {
                  $inc:{'products.$.quantity':1}//For an array $ symbol is used to change an element in an array
               }
               ).then(() => {
                  resolve()
               })
            }
            else{
               db.get().collection(collection.CART_COLLECTION)
               .updateOne({user:objectId(userId)},
                  {
                        $push:{products:proObj}
                  }
               ).then((response) => {
                  resolve()
               })
            }

         }
         else{
            let cartObj = {
               user:objectId(userId),
               products:[proObj]
            }
            db.get().collection(collection.CART_COLLECTION).insertOne(cartObj).then((response) => {
               resolve()
            })
         }
      })
   },
   getCartProducts:(userId) => {
      return new Promise(async(resolve,reject) => {
         let cartItems = await db.get().collection(collection.CART_COLLECTION).aggregate([
            {
               $match:{user:objectId(userId)}
            },
            {
               $unwind:'$products'
            },
            {
               $project:{
                  item:'$products.item',
                  quantity:'$products.quantity'
               }
            },
            {
               $lookup:{
                  from:collection.PRODUCT_COLLECTION,
                  localField:'item',
                  foreignField:'_id',
                  as:'product'//product is an array
               }
            },
            {
               $project:{
                  //1 and 0
                  item:1,
                  quantity:1,
                  product:{$arrayElemAt:['$product',0]}
               }
            }
            /*
            {
               $lookup:{
                  from:collection.PRODUCT_COLLECTION,
                  //Database variable $products
                  let:{proList:'$products'},
                  pipeline:[
                     {
                        $match:{
                           $expr:{
                              $in:['$_id',"$$proList"]
                           }
                        }
                     }
                  ],
                  as:'cartItems'
               }
            }
            */

         ]).toArray()
         //console.log(cartItems[0].products)
         console.log(cartItems)
         resolve(cartItems)
      })
   },
   getCartCount:(userId) => {
      return new Promise(async(resolve,reject) => {
         let count = 0
         let cart = await db.get().collection(collection.CART_COLLECTION).findOne({user:objectId(userId)})
         if(cart){
            count = cart.products.length
         }
         resolve(count)
      })
   },

   changeProductQuantity:(details) => {

      details.count = parseInt(details.count)
      console.log(details.count)
      details.quantity = parseInt(details.quantity)
      console.log(details.quantity)

      return new Promise((resolve,reject) => {
 
         if(details.count == -1 && details.quantity == 1){
            db.get().collection(collection.CART_COLLECTION)
            .updateOne({_id:objectId(details.cart)},
            {
               $pull:{products:{item:objectId(details.product)}}
            }
            ).then((response) => {
               resolve({removeProduct:true})
            })
         }else{
            db.get().collection(collection.CART_COLLECTION)
            .updateOne({_id:objectId(details.cart),'products.item':objectId(details.product)},
            {
               $inc:{'products.$.quantity':details.count}//For an array $ symbol is used to change an element in an array
            }
            ).then((response) => {
               resolve({status:true})
            })
         }
      
      })
   },

   getTotalAmount:(userId) => {
      return new Promise(async(resolve,reject) => {
         let total = await db.get().collection(collection.CART_COLLECTION).aggregate([
            {
               $match:{user:objectId(userId)}
            },
            {
               $unwind:'$products'
            },
            {
               $project:{
                  item:'$products.item',
                  quantity:'$products.quantity'
               }
            },
            {
               $lookup:{
                  from:collection.PRODUCT_COLLECTION,
                  localField:'item',
                  foreignField:'_id',
                  as:'product'//product is an array
               }
            },
            {
               $project:{
                  //1 and 0
                  item:1,
                  quantity:1,
                  product:{$arrayElemAt:['$product',0]}
               }
            },
            {
               /*
               For individual poduct price
               $project:{
                  total:{$sum:{$multiply:['$quantity',{$toInt:'$product.Price'}]}}
               }
               */

               //For total product price and grouping requires ID
               $group:{
                  _id:null,
                  total:{$sum:{$multiply:['$quantity',{$toInt:'$product.Price'}]}}
               }

            }
         ]).toArray()
         resolve(total[0].total)
      })
   },

   placeOrder:(order,products,total) => {
      return new Promise((resolve,reject) => {
         console.log(order,products,total)
         let status = order['payment-method']==='COD'?'placed':'pending'
         let orderObj={
            deliveryDetails:{
               mobile:order.mobile,
               adddress:order.address,
               pincode:order.pincode
            },
            userId:objectId(order.userId),
            paymentMethod:order['payment-method'],
            products:products,
            totalAmount:total,
            status:status
         }

         db.get().collection(collection.ORDER_COLLECTION).insertOne(orderObj).then((response) => {
            db.get().collection(collection.CART_COLLECTION).removeOne({user:objectId(order.userId)})
            resolve()
         })

      })
   },

   getCartProductList:(userId) => {
      return new Promise(async(resolve,reject) => {
         let cart = await db.get().collection(collection.CART_COLLECTION).findOne({user:objectId(userId)})
         console.log(cart)
         resolve(cart.products)
      })
   }

}