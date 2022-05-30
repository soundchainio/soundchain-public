import { LinkAnchor } from '../LinkAnchor';
import React from 'react';
import { ButtonProps, ButtonVariantProps, DynamicComponentProps } from '../Button';

/** This function provides an easy utility to override the "as" prop on Button components
 * and provide easy wrappers for common use cases link using the next/link with an anchor child automatically
 * by providing the value "a" on the "as" prop of any <Button/> component */
export function getButtonComponent(as: ButtonProps['as'], variant: string, props: DynamicComponentProps) {
  /** List of custom button traps */
  const customButtonComponents: Record<string, ButtonVariantProps['Component']> = {
    'a': (childProps: DynamicComponentProps) => <LinkAnchor {...props} {...childProps} />,
    '$a': (childProps: DynamicComponentProps) => <a {...props} {...childProps} />,
  };

  /** Custom button traps and tag components */
  if (typeof as === 'string') {
    /** If we have a trap for it, generate a component based on it */
    if (customButtonComponents[as]) {
      const CustomComponent = customButtonComponents[as];
      CustomComponent.displayName = `CustomButtonComponent(${variant}--${as})`;
      return CustomComponent;
    }

    /** Otherwise we create the component with whatever tag is passed on the "as" prop */
    const TagComponent = as;
    const CustomTagComponent = (childProps: DynamicComponentProps) => <TagComponent {...props} {...childProps} />;
    CustomTagComponent.displayName = `CustomButtonTagComponent(${variant}--${as})`;
    return CustomTagComponent;
  }

  /** For complete control we can also provide our own render method during <Button/> usage */
  const CustomRenderComponent = (childProps: DynamicComponentProps) => {
    const Component = as as unknown as React.FC<DynamicComponentProps>;

    return <Component {...props} {...childProps} />;
  };

  CustomRenderComponent.displayName = `CustomButtonTagComponent(${variant}--${as})`;
  return CustomRenderComponent;
}