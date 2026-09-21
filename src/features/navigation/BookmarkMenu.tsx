import { useI18n } from '../../i18n/react';
import { useState } from 'react';
import * as Menu from '@radix-ui/react-dropdown-menu';
import { HugeiconsIcon } from '@hugeicons/react';
import { ArrowRight01Icon, Folder01Icon } from '@hugeicons/core-free-icons';
import type { MenuEntry } from '../bookmarks/model';
import { SiteMark } from '../../components/SiteMark';
interface Props {
  entries: MenuEntry[];
  onEnter: () => void;
  onLeave: () => void;
}
function Items({ entries, onEnter, onLeave }: Props) {
  const { t } = useI18n();
  const [limit, setLimit] = useState(80);
  if (!entries.length) return <Menu.Item disabled className="menu-empty">{t('noBookmarks')}</Menu.Item>;
  return <>{entries.slice(0, limit).map((entry) => {
    if (entry.type === 'divider') return <Menu.Separator className="menu-separator" key={entry.id} />;
    if (entry.type === 'link') return <Menu.Item asChild key={entry.id}>
      <a className="menu-row" href={entry.bookmark.url} title={entry.bookmark.title}>
        <SiteMark bookmark={entry.bookmark} size="menu" /><span className="truncate">{entry.bookmark.title}</span>
      </a>
    </Menu.Item>;
    return <Menu.Sub key={entry.id}>
      <Menu.SubTrigger className="menu-row"><HugeiconsIcon aria-hidden="true" icon={Folder01Icon} size={16} strokeWidth={1.8} /><span className="truncate">{entry.title}</span><span className="folder-count">{entry.count}</span><HugeiconsIcon aria-hidden="true" icon={ArrowRight01Icon} size={14} /></Menu.SubTrigger>
      <Menu.Portal><Menu.SubContent className="glass bookmark-menu submenu ui-surface" sideOffset={13} collisionPadding={16}
        onPointerEnter={onEnter} onPointerLeave={onLeave}>
        <Items entries={entry.children} onEnter={onEnter} onLeave={onLeave} />
      </Menu.SubContent></Menu.Portal>
    </Menu.Sub>;
  })}{entries.length > limit && <Menu.Item className="menu-row menu-more" onSelect={(event) => { event.preventDefault(); setLimit(limit + 80); }}>{t('showMore', { count: entries.length - limit })}</Menu.Item>}</>;
}
export function BookmarkMenu(props: Props) {
  return <Menu.Portal><Menu.Content className="glass bookmark-menu ui-surface" side="top" align="center" alignOffset={-14}
    sideOffset={19} collisionPadding={16} onPointerEnter={props.onEnter} onPointerLeave={props.onLeave}
    onCloseAutoFocus={(event) => event.preventDefault()}>
    <Items {...props} />
  </Menu.Content></Menu.Portal>;
}
