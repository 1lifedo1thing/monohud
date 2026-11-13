'use client';
import * as React from 'react';
import { Dialog as BaseDialog } from '@base-ui/react/dialog';
import { Menu as BaseMenu } from '@base-ui/react/menu';
import { Select as BaseSelect } from '@base-ui/react/select';
import { Tabs as BaseTabs } from '@base-ui/react/tabs';
import { Tooltip as BaseTooltip } from '@base-ui/react/tooltip';
import { useMonohud } from './provider';
import { ChevronIcon, Lock, cx, mergeClass } from './utils';

/* Select */

export type SelectItem<Value> = { value: Value; label: React.ReactNode; hint?: React.ReactNode; disabled?: boolean };

export type SelectProps<Value> = Omit<BaseSelect.Root.Props<Value>, 'items' | 'children'> & {
  items: SelectItem<Value>[];
  label?: React.ReactNode;
  placeholder?: string;
  className?: string;
};

export function Select<Value>({ items, label, placeholder, className, ...props }: SelectProps<Value>) {
  const { container } = useMonohud();
  return (
    <BaseSelect.Root items={items as never} {...(props as BaseSelect.Root.Props<Value>)}>
      <div className={cx('mh-field', className)}>
        {label != null && <BaseSelect.Label className="mh-field__label">{label}</BaseSelect.Label>}
        <BaseSelect.Trigger className="mh-select-trigger mh-cut mh-lockable">
          <BaseSelect.Value placeholder={placeholder} />
          <BaseSelect.Icon className="mh-select-trigger__icon">
            <ChevronIcon />
          </BaseSelect.Icon>
          <Lock />
        </BaseSelect.Trigger>
      </div>
      <BaseSelect.Portal container={container}>
        <BaseSelect.Positioner className="mh-positioner" sideOffset={6} alignItemWithTrigger={false}>
          <BaseSelect.Popup className="mh-popup mh-cut" data-mh-bleep="open">
            <BaseSelect.List className="mh-select-list">
              {items.map((item) => (
                <BaseSelect.Item key={String(item.value)} value={item.value} disabled={item.disabled} className="mh-item">
                  <BaseSelect.ItemIndicator className="mh-item__marker" />
                  <BaseSelect.ItemText className="mh-item__text">{item.label}</BaseSelect.ItemText>
                  {item.hint != null && <span className="mh-item__hint">{item.hint}</span>}
                </BaseSelect.Item>
              ))}
            </BaseSelect.List>
          </BaseSelect.Popup>
        </BaseSelect.Positioner>
      </BaseSelect.Portal>
    </BaseSelect.Root>
  );
}

/* Menu */

type MenuContentProps = BaseMenu.Popup.Props & Pick<BaseMenu.Positioner.Props, 'align' | 'side' | 'sideOffset'>;

function MenuContent({ className, children, align, side, sideOffset = 6, ...props }: MenuContentProps) {
  const { container } = useMonohud();
  return (
    <BaseMenu.Portal container={container}>
      <BaseMenu.Positioner className="mh-positioner" align={align} side={side} sideOffset={sideOffset}>
        <BaseMenu.Popup {...props} className={mergeClass('mh-popup mh-cut', className)}>
          {children}
        </BaseMenu.Popup>
      </BaseMenu.Positioner>
    </BaseMenu.Portal>
  );
}

type MenuItemProps = BaseMenu.Item.Props & { hint?: React.ReactNode; tone?: 'danger' };

function MenuItem({ className, children, hint, tone, ...props }: MenuItemProps) {
  return (
    <BaseMenu.Item {...props} data-tone={tone} className={mergeClass('mh-item', className)}>
      <span className="mh-item__text">{children}</span>
      {hint != null && <span className="mh-item__hint">{hint}</span>}
    </BaseMenu.Item>
  );
}

export const Menu = {
  Root: BaseMenu.Root,
  Trigger: BaseMenu.Trigger,
  Content: MenuContent,
  Item: MenuItem,
  Separator: () => <BaseMenu.Separator className="mh-menu-separator" />,
};

/* Dialog */

type DialogContentProps = BaseDialog.Popup.Props & {
  /** Short reference shown above the title. */
  code?: string;
  title: React.ReactNode;
  description?: React.ReactNode;
  tone?: 'danger';
};

function DialogContent({ code, title, description, tone, className, children, ...props }: DialogContentProps) {
  const { container } = useMonohud();
  return (
    <BaseDialog.Portal container={container}>
      <BaseDialog.Backdrop className="mh-backdrop" />
      <BaseDialog.Popup {...props} data-tone={tone} className={mergeClass('mh-dialog mh-cut', className)}>
        <div className="mh-dialog__strip" aria-hidden="true">
          <span className="mh-micro">{code}</span>
          <span className="mh-dialog__hatch" />
        </div>
        <BaseDialog.Title className="mh-dialog__title">{title}</BaseDialog.Title>
        {description != null && <BaseDialog.Description className="mh-dialog__description">{description}</BaseDialog.Description>}
        {children}
      </BaseDialog.Popup>
    </BaseDialog.Portal>
  );
}

export const Dialog = {
  Root: BaseDialog.Root,
  Trigger: BaseDialog.Trigger,
  Content: DialogContent,
  Close: BaseDialog.Close,
  Actions: (props: React.ComponentProps<'div'>) => <div {...props} className={cx('mh-dialog__actions', props.className)} />,
};

/* Tooltip */

export type TooltipProps = {
  content: React.ReactNode;
  /** A single focusable element. */
  children: React.ReactElement<Record<string, unknown>>;
  side?: BaseTooltip.Positioner.Props['side'];
};

export function Tooltip({ content, children, side = 'top' }: TooltipProps) {
  const { container } = useMonohud();
  return (
    <BaseTooltip.Root>
      <BaseTooltip.Trigger render={children} />
      <BaseTooltip.Portal container={container}>
        <BaseTooltip.Positioner className="mh-positioner" side={side} sideOffset={8}>
          <BaseTooltip.Popup className="mh-tooltip mh-cut">{content}</BaseTooltip.Popup>
        </BaseTooltip.Positioner>
      </BaseTooltip.Portal>
    </BaseTooltip.Root>
  );
}

/* Tabs */

function TabsList({ className, children, ...props }: BaseTabs.List.Props) {
  return (
    <BaseTabs.List {...props} className={mergeClass('mh-tabs__list', className)}>
      {children}
      <BaseTabs.Indicator className="mh-tabs__indicator" />
    </BaseTabs.List>
  );
}

export const Tabs = {
  Root: BaseTabs.Root,
  List: TabsList,
  Tab: ({ className, ...props }: BaseTabs.Tab.Props) => <BaseTabs.Tab {...props} className={mergeClass('mh-tab', className)} />,
  Panel: ({ className, ...props }: BaseTabs.Panel.Props) => (
    <BaseTabs.Panel {...props} className={mergeClass('mh-tabs__panel', className)} />
  ),
};
