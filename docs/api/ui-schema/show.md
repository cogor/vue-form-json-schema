# show

Sometimes a field is only relevant if some condition is met. The `show` property is uses JSON Schema to evaluate if a field should be visibility or not.

There are 2 options: Full and Single.

## Full

The full model uses the entire form model as data.

```js
// Option 1 - full JSON schema
data() {
  return {
    uiSchema: [{
      component: 'div',
      children: [{
        component: 'div'
        show: {
          schema: {
            type: object,
            properties: {
              firstName: {
                type: 'string',
                minLength: 3
              }
            },
            required: ['firstName']
          }
        }
      }]
    }]
  }
}
```

The above is equivalent to

```js
const schema = {
  type: object,
  properties: {
    firstName: {
      type: 'string',
      minLength: 3
    }
  },
  required: ['firstName']
};

const data = {
  // Entire form model
  firstName,
  lastName,
  address,
  ...
}

// If there are no errors in ajv.errors then the field is shown
ajv.validate(schema, data);

```

## Single

The Full option can be a bit verbose when you only rely on a single field's model, and thus you set the `model` property on the `show` object to only use the value of that field's model.

```js
// Option 2 - single model
data() {
  return {
    uiSchema: [{
      component: 'div',
      children: [{
        component: 'div'
        show: {
          // Here we set to use only the value of the firstName model
          model: 'firstName'
          schema: {
            type: 'string',
            minLength: 3
          }
        }
      }]
    }]
  }
}
```