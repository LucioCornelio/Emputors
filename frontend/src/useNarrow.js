import { useEffect, useState } from 'react';

// True on phone-sized screens. Mobile-only layout changes hang from this, so desktop stays untouched.
export const NARROW_QUERY = '(max-width: 640px)';

const matches = () => typeof window !== 'undefined' && window.matchMedia(NARROW_QUERY).matches;

const useNarrow = () => {
  const [narrow, setNarrow] = useState(matches);
  useEffect(() => {
    const mq = window.matchMedia(NARROW_QUERY);
    const onChange = () => setNarrow(mq.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);
  return narrow;
};

export default useNarrow;
