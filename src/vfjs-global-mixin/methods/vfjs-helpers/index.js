import { set, cloneDeep } from '../../../helpers';
import vfjsFieldComponent from '../../../vfjs-field-component';
import { VFJS_EVENT_FIELD_COMPONENT_RESOLVED } from '../../../constants';

const vfjsHelpers = {
  vfjsHelperCreateField(vfjsFieldUiSchema) {
    const {
      id: vfjsFieldId,
      children = [],
      component,
      errorHandler: vfjsFieldErrorHandler,
      errorOptions: vfjsFieldErrorOptions = {},
      fieldOptions: vfjsFieldOptions = {},
      model: vfjsFieldModelKey = '',
      required: vfjsFieldRequired = false,
      valueProp: vfjsFieldValueProp = this.vfjsOptions.valueProp,
    } = vfjsFieldUiSchema;

    const vfjsFieldSchema = this.getVfjsFieldSchema(vfjsFieldModelKey) || {};
    const vfjsFieldSchemas = this.schemas;
    const vfjsFieldModel = this.getVfjsFieldModel(vfjsFieldModelKey);
    const vfjsFieldState = this.getVfjsFieldState(vfjsFieldModelKey) || {};
    const vfjsModel = this.getVfjsModel();
    const vfjsState = this.getVfjsState();

    // Get field errors
    const { vfjsFieldErrors = [] } = vfjsFieldState;

    // If this field is an errorHandler we pass the errors as the children
    // but only if the error handler does not have children of its own or
    // domProps.innerHTML is set
    const { domProps } = vfjsFieldOptions;
    const generateErrorsAsChildren = vfjsFieldErrorHandler
      && vfjsFieldErrors.length > 0
      && (!domProps || !domProps.innerHTML)
      && children.length === 0;

    const vfjsChildren = generateErrorsAsChildren
      ? this.vfjsHelperGetErrors(vfjsFieldErrors, vfjsFieldId)
      : children.map(this.vfjsHelperCreateField);

    const props = {
      ...vfjsFieldOptions,
      vfjsBus: this.vfjsBus,
      vfjsChildren,
      vfjsChildrenUiSchema: children,
      vfjsFieldErrorHandler,
      vfjsFieldErrorOptions,
      vfjsFieldErrors,
      vfjsFieldId,
      vfjsFieldModel,
      vfjsFieldModelKey,
      vfjsFieldOptions,
      vfjsFieldRequired,
      vfjsFieldSchema,
      vfjsFieldSchemas,
      vfjsFieldState,
      vfjsFieldUiSchema,
      vfjsFieldValueProp,
      vfjsOptions: this.vfjsOptions,
      vfjsModel,
      vfjsState,
    };

    return this.vfjsHelperCreateComponent({
      component,
      ...props,
    });
  },
  vfjsHelperGetErrors(errors = [], id) {
    return errors.map((error, index) => this.vfjsHelperCreateField({
      id: `${id}-error-${index}`,
      component: 'div',
      fieldOptions: {
        class: ['vfjs-error', 'vfjs-default-error-handler'],
        domProps: {
          innerHTML: error.message,
        },
      },
    }));
  },
  vfjsHelperHashString(string, binary = 62) {
    let integer = 0;

    for (let i = 0; i < string.length; i++) {
      const char = string.charCodeAt(i);
      integer = (integer * 33) ^ char; // eslint-disable-line no-bitwise
    }

    // Convert int to unsigned to get a positive number
    integer >>>= 0; // eslint-disable-line no-bitwise

    const chars = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const array = [];

    // Create an alphanumeric hash of unsigned int
    while (integer >= binary) {
      const char = integer % binary;
      array.push(chars[char]);
      integer = Math.floor(integer / binary);
    }

    return array.join('');
  },
  vfjsHelperUpdateWhenComponentResolves(componentKey, asyncComponentFactoryValue) {
    const component = (asyncComponentFactoryValue && asyncComponentFactoryValue.component)
      || asyncComponentFactoryValue;
    const promise = Promise.resolve(component);

    return promise
      .then((module) => {
        this.vfjsBus.emit(VFJS_EVENT_FIELD_COMPONENT_RESOLVED, {
          key: componentKey,
          value: {
            component: (module && module.default) || module,
          },
        });
      })
      .catch(() => {
        if (asyncComponentFactoryValue && asyncComponentFactoryValue.error) {
          this.vfjsBus.emit(VFJS_EVENT_FIELD_COMPONENT_RESOLVED, {
            key: componentKey,
            value: {
              error: asyncComponentFactoryValue.error,
            },
          });
        }
      });
  },
  vfjsHelperGetFieldAsyncComponentToRender(asyncComponent) {
    if (asyncComponent) {
      if (asyncComponent.component) {
        if (asyncComponent['[[PromiseStatus]]'] !== 'resolved') {
          if (asyncComponent['[[PromiseStatus]]'] === 'rejected') {
            if (asyncComponent.error) {
              return {
                status: 'rejected',
                component: asyncComponent.error,
              };
            }
          }

          if (asyncComponent.loading) {
            return {
              status: 'loading',
              component: asyncComponent.loading,
            };
          }
        }

        return {
          status: 'resolved',
          component: asyncComponent.component,
        };
      }
    }

    return asyncComponent;
  },
  vfjsHelperGetFieldAsyncComponent(componentKey, component) {
    const fieldComponentResolved = this.vfjsComponentsAsync.has(componentKey);

    if (fieldComponentResolved) {
      return this.vfjsComponentsAsync.get(componentKey);
    }

    const asyncComponentFactoryValue = component();
    this.vfjsHelperUpdateWhenComponentResolves(componentKey, asyncComponentFactoryValue);

    return asyncComponentFactoryValue;
  },
  vfjsHelperCreateAsyncComponent({ children = [], component, props }) {
    return this.$createElement(
      component,
      {
        key: props.vfjsFieldId,
        ...props.vfjsFieldOptions,
      },
      children,
    );
  },
  vfjsHelperCreateComponent({ component, ...props }) {
    // If the component matches one of the local components
    // passed in with the `components` prop
    const localComponent = this.vfjsComponents[component];
    const fieldComponent = localComponent || component;

    if (typeof fieldComponent === 'function') {
      const asyncComponent = this.vfjsHelperGetFieldAsyncComponent(component, fieldComponent);
      const asyncComponentToRender = this.vfjsHelperGetFieldAsyncComponentToRender(asyncComponent);

      switch (asyncComponentToRender.status) {
        case 'loading':
          return this.vfjsHelperCreateFieldComponent({
            component: asyncComponentToRender.component,
            vfjsFieldId: props.vfjsFieldId,
          });
        default:
          return this.vfjsHelperCreateFieldComponent({
            component: asyncComponentToRender.component,
            ...props,
          });
      }
    }

    return this.vfjsHelperCreateFieldComponent({
      component: fieldComponent,
      ...props,
    });
  },
  vfjsHelperCreateFieldComponent({ component, vfjsChildren = [], ...props }) {
    if (!props.vfjsFieldModelKey) {
      return this.$createElement(
        component,
        {
          key: props.vfjsFieldId,
          ...props.vfjsFieldOptions,
        },
        vfjsChildren,
      );
    }

    return this.$createElement(
      vfjsFieldComponent,
      {
        key: `${props.vfjsFieldId}-wrapper`,
        props: {
          ...props,
          vfjsComponent: component,
        },
      },
      () => vfjsChildren,
    );
  },
  vfjsHelperApplyFieldModel(key, value) {
    const newVfjsModel = cloneDeep(this.getVfjsModel());
    set(newVfjsModel, key, value);
    return newVfjsModel;
  },
  // The level param helps us to differentiate further between fields.
  // As the same field configuration may be present throughout the ui schema
  // and thus have the same hash.
  //
  // We mediate this by providing the depth level as a second param
  // which will make the hash unique for every field
  vfjsHelperGenerateField(field, level = 0) {
    if (!field) {
      return false;
    }

    const { children = [], ...fieldWithoutChildren } = field;
    const objString = JSON.stringify({ fieldWithoutChildren, level });
    const id = this.vfjsHelperHashString(objString);

    return {
      ...field,
      id,
      children: children.map((child, i) => this.vfjsHelperGenerateField(child, (i + 1) * (level + 1))),
    };
  },
  vfjsHelperChildArrayMapper({ model, children = [], ...child }, parentModel, index) {
    return {
      ...child,
      model: this.vfjsHelperGetChildArrayModelAtIndex(model, parentModel, index),
      children: this.vfjsHelperChildArrayReducerMapper(parentModel, children, index),
    };
  },
  vfjsHelperChildArrayReducerMapper(model, children = [], index) {
    return children.reduce(
      (allChildren, child) => [
        ...allChildren,
        this.vfjsHelperChildArrayMapper(child, model, index),
      ],
      [],
    );
  },
  vfjsHelperGetChildArrayModelAtIndex(model, parentModel, index) {
    const relativeModel = this.vfjsHelperGetRelativeModel(model, parentModel);
    return relativeModel ? `${parentModel}.${index}.${relativeModel}` : model;
  },
  vfjsHelperGetRelativeModel(model, parentModel) {
    return model ? String(model).substr(parentModel.length + 1) : model;
  },
  vfjsHelperGetParentModel(model) {
    const parentIndex = String(model).lastIndexOf('.');
    return String(model).substr(0, parentIndex);
  },
  vfjsHelperFieldIsRequired(model) {
    if (model) {
      const parentModel = this.vfjsHelperGetParentModel(model);
      if (parentModel) {
        return this.vfjsFieldsRequired.indexOf(parentModel) !== -1;
      }

      return this.vfjsFieldsRequired.indexOf(model) !== -1;
    }

    return false;
  },
  vfjsHelperFieldIsArray(key) {
    if (!key) {
      return false;
    }

    const schema = this.getVfjsFieldSchema(key);
    return schema ? Array.isArray(schema.items) : false;
  },
  vfjsHelperGetFieldsWithClearOnHide(fields = []) {
    return fields.reduce((models, { children = [], displayOptions = {}, model }) => {
      if (displayOptions.clearOnHide) {
        if (model) {
          // eslint-disable-next-line no-param-reassign
          models[model] = displayOptions.clearOnHide;
        } else if (!model && typeof displayOptions.clearOnHide === 'string') {
          // eslint-disable-next-line no-param-reassign
          models[displayOptions.clearOnHide] = displayOptions.clearOnHide;
        }
      }

      return {
        ...models,
        ...this.vfjsHelperGetFieldsWithClearOnHide(children),
      };
    }, {});
  },
  vfjsHelperCastValueToSchemaType(key, value) {
    if (typeof value !== 'undefined') {
      const { type } = this.getVfjsSchema(key);

      // Convert to a numeric value
      if (type === 'number') {
        return Number(value);
      }

      if (type === 'integer') {
        return parseInt(value);
      }

      // Convert to a boolean value
      if (type === 'boolean' && (value === 'true' || value === 'false')) {
        return value === 'true';
      }
    }

    return value;
  },
  getVfjsFieldsModels(fields) {
    return fields.reduce(
      (models, { children = [], model }) => [
        ...models,
        ...(model && models.indexOf(model) === -1 ? [model] : []),
        ...this.getVfjsFieldsModels(children),
      ],
      [],
    );
  },
};

export default vfjsHelpers;
