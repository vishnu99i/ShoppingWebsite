const mongoClient = require('mongodb').MongoClient

const state = {
   db : null
}

//Function for connecting when calling from any file
module.exports.connect = function(done){
   //done is a callback
   const url = 'mongodb://127.0.0.1:27017'
   const dbname = 'shopping'

   mongoClient.connect(url,(err,data) => {
      if(err) return done(err)
      state.db = data.db(dbname)
      done()
   })

}

module.exports.get = function(){
   return state.db
}