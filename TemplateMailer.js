console.log('Loading function')

exports.lambda_handler = function (event, context) {
  console.log('Received event:', JSON.stringify(event, null, 2))

  /**
   switch (event.operation) {
    case 'store_smtp_credential':
      dynamo.putItem(event.payload, context.done);
      break;
    case 'store_template':
      dynamo.getItem(event.payload, context.done);
      break;
    case 'get_credentials':
      dynamo.updateItem(event.payload, context.done);
      break;
    case 'get_templates':
      dynamo.deleteItem(event.payload, context.done);
      break;
    default:
      context.fail(new Error('Unrecognized operation "' + operation + '"'));
  }*/
  console.log(event.operation)
  console.log(event.payload)
  context.done()
}
