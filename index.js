import { DeleteItemCommand, GetItemCommand, PutItemCommand, QueryCommand, ScanCommand } from "@aws-sdk/client-dynamodb";
import { marshall, unmarshall } from "@aws-sdk/util-dynamodb";
import { ddbClient } from "./ddbclient";
import { v4 as uuidv4 } from "uuid";

export const handler = async (event) => {
    let body = {}
    try{
        switch (event.httpMethod) {
            case "GET":
                if(event.queryParameteters!=null) {
                    body = await getProductsByQueryParams(event);
                }
                else if (event.pathParameters != null) {
                    body = await getProduct(event.pathParameters.id);
                } else {
                    body = await getAllProducts();
                }
                break;
            case "POST":
                body = await createProduct(event);
                break;
            case "DELETE":
                body = await deleteProduct(event.pathParameters.id);
                break;
            case "PUT":
                body = await updateProduct(event);
                break;

            default:
                throw new Error("Unsupported route");
        }
            return {
            statusCode: 200,
            body:JSON.stringify({
                    message:`Successfully completed ${event.httpMethod}`,
                    body
                })
            };
    } catch(err) {
            return {
                statusCode:500,
                body:JSON.stringify({
                    message:`Something went wrong for ${event.httpMethod}`,
                    errorMessage:err.message,
                    errorStack:err.stack
                })
            }
    }
   
}

const getProduct = async(productId) => {
    console.log("Get Product");
    try{

        const params = {
            TableName : process.env.DYNAMO_DB_TABLE_NAME,
            Key:marshall({id:productId})
        }

        const {Item} = await ddbClient.send(new GetItemCommand(params));
        console.log(Item);
        return Item ? unmarshall(Item):{};

    }catch(err) {
        console.error(err);
        throw err;
    }
}

const getAllProducts = async () => {
  console.log("Get All Product");
  try {
    const params = {
      TableName: process.env.DYNAMO_DB_TABLE_NAME
    };

    const { Item } = await ddbClient.send(new ScanCommand(params));
    console.log(Item);
    return Item ? unmarshall(Item) : {};
    } catch (err) {
        console.error(err);
        throw err;
    }
};

const getProductsByQueryParams = async () => {
  console.log("Get Product By Query params");
  const productId = event.pathParameters.id,
    category = event.queryParameteters.category;
  try {
    const params = {
      keyConditionExpression:'id = :productId',
      FilterExpression:'contains (category,:category) ',
      ExpressionAttributeValue: {
        ':productId': {S : productId},
        ':category': {S: category}
      },
      TableName: process.env.DYNAMO_DB_TABLE_NAME,

    };

    const { Items } = await ddbClient.send(new QueryCommand(params));
    console.log(Items);
    return Items.map(item => unmarshall(item));
  } catch (err) {
    console.error(err);
    throw err;
  }
};

const createProduct = async () => {
  console.log("create Product");
  try {
    const requestBody = JSON.parse(event.body);
    const productId = uuidv4();
    requestBody.id = productId;
    const params = {
      TableName: process.env.DYNAMO_DB_TABLE_NAME,
      Item:marshall(requestBody || {})
    };

    const createResult = await ddbClient.send(new PutItemCommand(params));
    console.log(createResult);
    return createResult ? unmarshall(createResult) : {};
  } catch (err) {
    console.error(err);
    throw err;
  }
};

const deleteProduct = async(productId) => {
    console.log("Delete Product");
    try{

        const params = {
            TableName : process.env.DYNAMO_DB_TABLE_NAME,
            Key:marshall({id:productId})
        }

        const deleteResult = await ddbClient.send(new DeleteItemCommand(params));
        console.log(deleteResult);
        return deleteResult ? unmarshall(deleteResult):{};

    }catch(err) {
        console.error(err);
        throw err;
    }
}

const updateProduct = async (event) => {
  try {
    const requestBody = JSON.parse(event.body);
    const objKeys = Object.keys(requestBody);
    console.log(
      `updateProduct function. requestBody : "${requestBody}", objKeys: "${objKeys}"`
    );

    const params = {
      TableName: process.env.DYNAMODB_TABLE_NAME,
      Key: marshall({ id: event.pathParameters.id }),
      UpdateExpression: `SET ${objKeys
        .map((_, index) => `#key${index} = :value${index}`)
        .join(", ")}`,
      ExpressionAttributeNames: objKeys.reduce(
        (acc, key, index) => ({
          ...acc,
          [`#key${index}`]: key,
        }),
        {}
      ),
      ExpressionAttributeValues: marshall(
        objKeys.reduce(
          (acc, key, index) => ({
            ...acc,
            [`:value${index}`]: requestBody[key],
          }),
          {}
        )
      ),
    };

    const updateResult = await ddbClient.send(new UpdateItemCommand(params));
    console.log(updateResult);
    return updateResult;
  } catch (e) {
    console.error(e);
    throw e;
  }
};




