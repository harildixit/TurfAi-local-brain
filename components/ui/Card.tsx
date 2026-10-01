import type { FC, HTMLAttributes } from 'react';
import { cx } from './cx';

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  as?: 'div' | 'section' | 'article';
}

const Card: FC<CardProps> = ({ as = 'div', className, ...rest }) => {
  const Component = as;
  return (
    <Component
      className={cx(
        'bg-slate-900/30 border border-slate-800 rounded-2xl backdrop-blur-sm',
        className
      )}
      {...rest}
    />
  );
};

export default Card;

