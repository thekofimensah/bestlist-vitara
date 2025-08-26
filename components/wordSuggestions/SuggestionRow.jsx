import React from 'react';
import SuggestionButton from './SuggestionButton';

const SuggestionRow = React.memo(({ items, offset = false, onTap, onLongPress }) => {
  return (
    <div className="flex gap-2 items-center" style={{ paddingLeft: offset ? 8 : 0 }}>
      {items.map((s) => (
        <SuggestionButton key={s.id} suggestion={s} onTap={onTap} onLongPress={onLongPress} />
      ))}
    </div>
  );
});

export default SuggestionRow;


