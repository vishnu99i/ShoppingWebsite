var express = require('express');
var router = express.Router();
const productHelpers = require('../helpers/producthelpers')
const userHelpers = require('../helpers/userhelpers')

/* GET home page. */
router.get('/', function(req, res, next) {

  //To check user login status
  let user = req.session.user
  console.log(user)

  productHelpers.getAllProducts().then((products) => {
    console.log(products);
    res.render('user/viewproducts',{products,user});
  }) 
});

//User login
router.get('/login',(req,res) => {
  res.render('user/login')
})

//User signup
router.get('/signup',(req,res) => {
  res.render('user/signup')
})

//Use signup data to database and the password will be in encrypted format
router.post('/signup',(req,res) => {
  userHelpers.doSignup(req.body).then((response) => {
    console.log(response);
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
      res.redirect('/login')
    }
  })
})

//For logout,we have to clear the sessions
router.get('/logout',(req,res) => {
  req.session.destroy()
  res.redirect('/')
})

module.exports = router;
