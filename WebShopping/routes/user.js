var express = require('express');
var router = express.Router();
const productHelpers = require('../helpers/producthelpers')
const userHelpers = require('../helpers/userhelpers')
//Middleware to check user is logged in or not
const verifyLogin = (req,res,next) => {
  if(req.session.user.loggedIn){
    next()
  }
  else{
    res.redirect('/login')
  }
}

/* GET home page. */
router.get('/', async function(req, res, next) {

  //To check user login status
  let user = req.session.user
  console.log(user)

  let cartCount = null
  if(req.session.user){
  cartCount = await userHelpers.getCartCount(req.session.user._id)
  }

  productHelpers.getAllProducts().then((products) => {
    console.log(products);
    res.render('user/viewproducts',{products,user,cartCount});
  }) 
});

//User login
router.get('/login',(req,res) => {
  if(req.session.user){
    res.redirect('/')
  }
  else{
    res.render('user/login',{"loginErr": req.session.userLoginErr})
    req.session.userLoginErr = false
  }
})

//User signup
router.get('/signup',(req,res) => {
  res.render('user/signup')
})

//Use signup data to database and the password will be in encrypted format
router.post('/signup',(req,res) => {
  userHelpers.doSignup(req.body).then((response) => {
    console.log(response);

    req.session.user = response
    req.session.user.loggedIn = true
    res.redirect('/')

  })
})

router.post('/login',(req,res) => {
  userHelpers.doLogin(req.body).then((response) => {
    if(response.status){
      req.session.user = response.user
      req.session.user.loggedIn = true
      res.redirect('/')
    }
    else{
      //For an invalid user,show an error message
      //req.session.loginErr = true
      req.session.userLoginErr = "Invalid username or password"

      res.redirect('/login')
    }
  })
})

//For logout,we have to clear the sessions
router.get('/logout',(req,res) => {
  req.session.user=null
  res.redirect('/')
})

router.get('/cart',verifyLogin,async(req,res) => {
  let products = await userHelpers.getCartProducts(req.session.user._id)
  let totalValue = 0

  if(products.length>0){
    totalValue = await userHelpers.getTotalAmount(req.session.user._id)
  }
  
  console.log(products)
  res.render('user/cart',{products,user:req.session.user._id,totalValue})
})

router.get('/addtocart/:id',(req,res) => {
  console.log("API Call")
  userHelpers.addToCart(req.params.id,req.session.user._id).then(() => {
    //res.redirect('/')
    res.json({status:true})
  })
})

router.post('/changeproductquantity',(req,res,next) => {
  console.log(req.body)
  console.log(req.body.cart)

  userHelpers.changeProductQuantity(req.body).then(async(response) => {

    response.total = await userHelpers.getTotalAmount(req.body.user)

    res.json(response)
  })
})

router.get('/place-order',verifyLogin,async(req,res) => {
  console.log("API Call")
  let total = await userHelpers.getTotalAmount(req.session.user._id)
  res.render('user/place-order',{total,user:req.session.user})
})

router.post('/place-order',async(req,res) => {
  let total = await userHelpers.getCartProductList(req.body.userId)
  let totalPrice = await userHelpers.getTotalAmount(req.body.userId)
  userHelpers.placeOrder(req.body,total,totalPrice).then((orderId) => {
    console.log(orderId)
    if(req.body['payment-method'] === 'COD'){
      res.json({codSuccess:true})
    }
    else{
      userHelpers.generateRazorpay(orderId,totalPrice).then((response) => {
        res.json(response)
      })
    }
    
  })
  console.log(req.body)
})

router.get('/order-success',(req,res) => {
  res.render('user/order-success',{user:req.session.user})
})

router.get('/orders',async(req,res) => {
  let orders = await userHelpers.getUserOrders(req.session.user._id)
  res.render('user/orders',{user:req.session.user,orders})
})

router.get('/view-order-products/:id',async(req,res) => {
  let products = await userHelpers.getOrderProducts(req.params.id)
  res.render('user/view-order-products',{user:req.session.user,products})
})

router.post('/verify-payment',(req,res) => {
  console.log(req.body)
  userHelpers.verifyPayment(req.body).then(() => {
    userHelpers.changePaymentStatus(req.body['order[receipt]']).then(() => {
      console.log("Payment successfull")
      res.json({status:true})
    })
  }).catch((err) => {
    console.log(err)
    res.json({status:false})
  })
})

module.exports = router;