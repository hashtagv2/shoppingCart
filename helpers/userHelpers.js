const collections = require('../config/collections')
db=require('../config/connection')
const bcrypt=require('bcrypt')
const { ObjectID } = require('mongodb')
const { response } = require('express')
var objectId=require('mongodb').ObjectID

module.exports={
    doSignup:(userData)=>{
        return new Promise(async(resolve,reject)=>{
            userData.Password = await bcrypt.hash(userData.Password,10)
            db.get().collection(collections.USER_COLLECTION).insertOne(userData).then((data)=>{
                resolve(data.ops[0])
            })

        })
    },
    doLogin:(userData)=>{
        return new Promise(async(resolve,reject)=>{
              let loginStatus=false
              let response ={}
            let user=await db.get().collection(collections.USER_COLLECTION).findOne({Email:userData.Email})

            console.log("user data")
            console.log(user._id)
            console.log("user data End")

            if(user){
                bcrypt.compare(userData.Password,user.Password).then((status)=>{
                    if(status){
                        console.log("Login Success")
                        response.user = user
                        response.status = true
                        resolve(response)
                    }else{
                        console.log("Login Failed , Incorrect Password")
                        resolve({status:false})
                    }
                })
            }else{
                console.log("Login Failed, User Not Found")
                resolve({status:false})
            }
        })
    },
    addToCart:(proId,userId)=>{

        proObj={
            item:objectId(proId),
            quantity:1
        }
        
        return new Promise(async(resolve,reject)=>{
            let userCart = await db.get().collection(collections.CART_COLLECTION).findOne({user:objectId(userId)})

            if(userCart){
                let proExist = userCart.products.findIndex(product=>product.item==proId)
                console.log(proExist)
                if(proExist!=-1){
                    db.get().collection(collections.CART_COLLECTION)
                    .updateOne({user:objectId(userId),'products.item':objectId(proId)},{
                        $inc:{'products.$.quantity':1}
                    }
                        ).then(()=>{
                            resolve()
                        })
                }else{
                db.get().collection(collections.CART_COLLECTION)
                .updateOne({user:objectId(userId)},
                    {
                        $push:{
                            products:proObj
                        }

                    }
                ).then((response)=>{
                    resolve()
                })
            }

            }else{
                let cartObj ={
                    user:objectId(userId),
                    products:[proObj ]
                }

                db.get().collection(collections.CART_COLLECTION).insertOne(cartObj).then((response)=>{
                    resolve()
                })
            }
        })
    },
    getCartProducts:(userId)=>{
        return new Promise(async(resolve,reject)=>{
            let cartItems = await db.get().collection(collections.CART_COLLECTION).aggregate([
                {
                    $match:{user:objectId(userId)}
                },{
                    $unwind:'$products'
                },{
                    $project:{
                        item:'$products.item',
                        quantity:'$products.quantity'
                    }
                },{
                    $lookup:{
                        from:collections.PRODUCT_COLLECTION,
                        localField:'item',
                        foreignField:'_id',
                        as:'product'
                    }
                },{
                    $project:{item:1,quantity:1,product:{$arrayElemAt:['$product',0]}}
                }
                
            ]).toArray()
            resolve(cartItems)
        })
    },
    getCartCount:(userId)=>{
        return new Promise(async(resolve,reject)=>{
            let count = 0;
            let cart = await db.get().collection(collections.CART_COLLECTION).findOne({user:objectId(userId)})
            if(cart){
                count= cart.products.length

            }
            resolve(count)
        })
    },
    changeProductQuantity:(details)=>{
        details.count = parseInt(details.count)
        return new Promise((resolve,reject)=>{
            if(details.count==-1&&details.quantity==1){
                db.get().collection(collections.CART_COLLECTION)
                    .updateOne({_id:objectId(details.cart)},
                    {
                        $pull:{products:{item:objectId(details.product)}}
                    }).then((response)=>{
                        resolve({removeProduct:true})
                    })
            }else{
                db.get().collection(collections.CART_COLLECTION)
                    .updateOne({_id:objectId(details.cart),'products.item':objectId(details.product)},
                    {
                        $inc:{'products.$.quantity':details.count}
                    }).then((response)=>{  
                            resolve(true)
                        })
                }
        
                
            })
    },
    getTotalAmount:(userId)=>{
        console.log(userId,"userid+152")
        return new Promise(async(resolve,reject)=>{
            let Total = await db.get().collection(collections.CART_COLLECTION).aggregate([
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
                        from:collections.PRODUCT_COLLECTION,
                        localField:'item',
                        foreignField:'_id',
                        as:'product'
                    }
                },
                {
                    $project:{item:1,quantity:1,product:{$arrayElemAt:['$product',0]}}
                },
                {
                    $group:{
                        _id:null,
                        total:{$sum:{$multiply:['$quantity','$product.Price']}}
                    }
                }
                
            ]).toArray()
            
            
            resolve(Total[0].total) //totalprice
        })

    }

    
            

}
