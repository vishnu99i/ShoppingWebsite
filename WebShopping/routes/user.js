var express = require('express');
var router = express.Router();
const productHelpers = require('../helpers/producthelpers')
const userHelpers = require('../helpers/userhelpers')
//Middleware to check user is logged in or not
const verifyLogin = (req,res,next) => {
  if(req.session.loggedIn){
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
  if(req.session.loggedIn){
    res.redirect('/')
  }
  else{
    res.render('user/login',{"loginErr": req.session.loginErr})
    req.session.loginErr = false
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

    req.session.loggedIn = true
    req.session.user = response
    res.redirect('/')

  })
})

router.post('/login',(req,res) => {
  userHelpers.doLogin(req.body).then((response) => {
    if(response.status){
      req.session.loggedIn = true
      req.session.user = response.user
      res.redirect('/')
    }
    else{
      //For an invalid user,show an error message
      //req.session.loginErr = true
      req.session.loginErr = "Invalid username or password"

      res.redirect('/login')
    }
  })
})

//For logout,we have to clear the sessions
router.get('/logout',(req,res) => {
  req.session.destroy()
  res.redirect('/')
})

router.get('/cart',verifyLogin,async(req,res) => {
  let products = await userHelpers.getCartProducts(req.session.user._id)
  console.log(products)
  res.render('user/cart',{products,user:req.session.user})
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
  userHelpers.changeProductQuantity(req.body).then((response) => {
    res.json(response)
  })
})

module.exports = router;