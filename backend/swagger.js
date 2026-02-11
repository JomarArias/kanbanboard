const swaggerJsDoc = require('swagger-jsdoc')  //npm i swagger-ui-express
const swaggerUi = require('swagger-ui-express')

// CONFIGURAR SWAGGER  
const swaggerOptions={
    swaggerDefinition:{
        openapi:'3.1.0',
        info:{
            title:'API de kanbanboard',
            version:'1.0.0',
            description:'API de kanbanboard'
        },
    },
    apis:['./routes/*.js'],   // la carpeta de rutas de swagger
}

const swaggerDocs = swaggerJsDoc(swaggerOptions)

module.exports = {
    swaggerUi,swaggerDocs
}