'use client';

import React from 'react';
import { useApp } from '@/components/providers/AppProvider';
import { Select } from '@/components/ui/primitives';

/** Platform scope selector (company-wide or one A-Group platform). */
export default function PlatformFilter() {
  const { platform, setPlatform, tr, lang } = useApp();
  const corporate = lang === 'ar' ? 'الشركة (المقر)' : 'Corporate';
  const tech = lang === 'ar' ? 'البنية التقنية' : 'Tech Infrastructure';
  return (
    <Select label={tr.platforms} value={platform} onChange={setPlatform}>
      <option value="all">{tr.allPlatforms}</option>
      <option value="A-Stay">{tr.astay}</option>
      <option value="A-Market">{tr.amarket}</option>
      <option value="A-Space">{tr.aspace}</option>
      <option value="Corporate">{corporate}</option>
      <option value="Tech Infrastructure">{tech}</option>
    </Select>
  );
}
