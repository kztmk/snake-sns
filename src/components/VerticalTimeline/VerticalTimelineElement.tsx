import dayjs from 'dayjs';
import React, { CSSProperties, FC, ReactNode } from 'react';
import { IconTrash } from '@tabler/icons-react';
import classNames from 'classnames';
import { IntersectionObserverProps, InView } from 'react-intersection-observer';
import classes from './VerticalTimelineElement.module.css';

interface VerticalTimelineElementProps {
  children?: ReactNode | ReactNode[];
  className?: string;
  contentArrowStyle?: CSSProperties | null;
  contentStyle?: CSSProperties | null;
  date?: ReactNode;
  dateClassName?: string;
  icon?: ReactNode;
  iconClassName?: string;
  iconOnClick?: () => void;
  onTimelineElementClick?: () => void;
  iconStyle?: CSSProperties | null;
  id: string;
  position?: 'left' | 'right';
  style?: CSSProperties | null;
  textClassName?: string;
  visible?: boolean;
  shadowSize?: 'small' | 'medium' | 'large';
  onDelete?: (id: string) => void;
  intersectionObserverProps?: Partial<IntersectionObserverProps>;
}

const VerticalTimelineElement: FC<VerticalTimelineElementProps> = ({
  children = '',
  className = '',
  contentArrowStyle = null,
  contentStyle = null,
  date = '',
  dateClassName = '',
  icon = null,
  iconClassName = '',
  iconOnClick = null,
  onTimelineElementClick = null,
  iconStyle = null,
  id = '',
  position = 'left',
  style = null,
  textClassName = '',
  onDelete,
  intersectionObserverProps = {
    rootMargin: '0px 0px -40px 0px',
    triggerOnce: true,
  },
  visible = false,
  shadowSize = 'small', // small | medium | large
}) => {
  const handleDeleteClick = (e: React.MouseEvent) => {
    e.stopPropagation(); // イベントの伝播を停止
    if (onDelete && id) {
      onDelete(id);
    }
    console.log('delete clicked for id:', id);
  };

  // 日付をフォーマットする関数
  const formatDate = (dateValue: ReactNode): ReactNode => {
    // 日付が文字列の場合のみフォーマット変換を行う
    if (typeof dateValue === 'string' && dateValue) {
      try {
        return dayjs(dateValue).format('YYYY/MM/DD HH:mm');
      } catch (error) {
        console.error('日付の変換に失敗しました:', error);
        return dateValue; // エラー時は元の値をそのまま返す
      }
    }
    return dateValue; // 文字列以外はそのまま返す
  };

  return (
    <InView {...intersectionObserverProps}>
      {({ inView, ref }) => (
        <div
          ref={ref}
          id={id}
          className={classNames(className, classes['vertical-timeline-element'], {
            [classes['vertical-timeline-element--left']]: position === 'left',
            [classes['vertical-timeline-element--right']]: position === 'right',
            [classes['vertical-timeline-element--no-children']]: children === '',
          })}
          style={style || undefined}
        >
          {onDelete && (
            <button
              type="button"
              className={classes['delete-button']}
              onClick={handleDeleteClick}
              aria-label="削除"
            >
              <IconTrash size={18} />
            </button>
          )}
          <React.Fragment>
            <span
              style={iconStyle || undefined}
              onClick={iconOnClick || undefined}
              className={classNames(
                iconClassName,
                classes['vertical-timeline-element-icon'],
                classes[`shadow-size-${shadowSize}`],
                {
                  [classes['bounce-in']]: inView || visible,
                  [classes['is-hidden']]: !(inView || visible),
                }
              )}
            >
              {icon}
            </span>
            <div
              style={contentStyle || undefined}
              onClick={onTimelineElementClick || undefined}
              className={classNames(textClassName, classes['vertical-timeline-element-content'], {
                [classes['bounce-in']]: inView || visible,
                [classes['is-hidden']]: !(inView || visible),
              })}
            >
              <div
                style={contentArrowStyle || undefined}
                className={classes['vertical-timeline-element-content-arrow']}
              />
              {children}
              <span
                className={classNames(dateClassName, classes['vertical-timeline-element-date'])}
              >
                投稿予定:{formatDate(date)}
              </span>
            </div>
          </React.Fragment>
        </div>
      )}
    </InView>
  );
};

export default VerticalTimelineElement;
