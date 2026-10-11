import {Hct, SchemeTonalSpot, argbFromHex, hexFromArgb} from "@material/material-color-utilities";
const roles=["primary","onPrimary","primaryContainer","onPrimaryContainer","secondary","onSecondary","secondaryContainer","onSecondaryContainer","tertiary","onTertiary","tertiaryContainer","onTertiaryContainer","error","onError","errorContainer","onErrorContainer","surface","onSurface","surfaceVariant","onSurfaceVariant","outline","outlineVariant","surfaceDim","surfaceBright","surfaceContainerLowest","surfaceContainerLow","surfaceContainer","surfaceContainerHigh","surfaceContainerHighest","inverseSurface","inverseOnSurface","inversePrimary","shadow","scrim"];
export function generate(seed,dark){
 const scheme=new SchemeTonalSpot(Hct.fromInt(argbFromHex(seed)),dark,0);
 const system=Object.fromEntries(roles.map(role=>[role,hexFromArgb(scheme[role])]));
 const s=system;
 return {system,legacy:{seed,toolbarSurface:s.primaryContainer,onToolbar:s.onPrimaryContainer,toolbarHover:s.primaryContainer,toolbarPressed:s.primaryContainer,primarySurface:s.primaryContainer,onPrimary:s.onPrimaryContainer,primaryPressed:s.primaryContainer,accentInk:s.primary,controlAccent:s.primary,controlStrong:s.primary,actionPrimary:s.primary,onActionPrimary:s.onPrimary,actionPrimaryPressed:s.primary,actionSecondary:s.secondaryContainer,onActionSecondary:s.onSecondaryContainer,actionSecondaryPressed:s.secondaryContainer,switchThumb:s.primary,switchTrack:s.primaryContainer,navIcon:s.primary,navLabel:s.primary,swatchForeground:window.MaterialPalette.generate(seed,dark).swatchForeground},
 surfaces:{page:s.surface,surface:s.surfaceContainerLow,card:s.surfaceContainerLow,ink:s.onSurface,muted:s.onSurfaceVariant,disabled:s.onSurfaceVariant,divider:s.outlineVariant,log:s.surfaceContainerHighest,danger:s.error,"raised-surface":s.surfaceContainerHigh,"inset-surface":s.surfaceContainerLowest,"sidebar-surface":s.surface,"status-surface":s.surfaceContainer}};
}
export const version="0.4.0";
