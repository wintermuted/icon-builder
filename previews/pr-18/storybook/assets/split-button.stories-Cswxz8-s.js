import{n as e}from"./rolldown-runtime-sJBDdmOt.js";import{n as t,p as n}from"./iframe-9GxATJBz.js";import{n as r,t as i}from"./src-DsyK_ZYA.js";function a(e){let[t,n]=(0,o.useState)(null);return(0,s.jsxs)(`div`,{children:[(0,s.jsx)(r,{...e,onAction:e=>n(e)}),(0,s.jsx)(`p`,{role:`status`,children:t?`Added ${t}`:`Choose a shape, then add it.`})]})}var o,s,c,l,u,d,f,p;function m(){return(m=e((()=>{o=n(),i(),s=t(),{useArgs:c}=__STORYBOOK_MODULE_PREVIEW_API__,l={id:`shared-splitbutton`,title:`Shared/Controls/SplitButton`,component:r,args:{actionLabel:`Add element`,menuLabel:`Choose shape`,value:`rect`,options:[{value:`rect`,label:`Rectangle`,icon:`Square`},{value:`circle`,label:`Circle`,icon:`Circle`},{value:`path`,label:`Path`,icon:`PenLine`}]},argTypes:{options:{control:!1},onAction:{control:!1},onValueChange:{control:!1},buttonProps:{control:!1}},render:function(e){let[,t]=c();return(0,s.jsx)(a,{...e,onValueChange:e=>t({value:e})})}},u={},d={args:{disabled:!0}},f={args:{options:[],value:void 0}},p=[`Default`,`Disabled`,`Empty`],u.parameters={...u.parameters,docs:{...u.parameters?.docs,source:{originalSource:`{}`,...u.parameters?.docs?.source}}},d.parameters={...d.parameters,docs:{...d.parameters?.docs,source:{originalSource:`{
  args: {
    disabled: true
  }
}`,...d.parameters?.docs?.source}}},f.parameters={...f.parameters,docs:{...f.parameters?.docs,source:{originalSource:`{
  args: {
    options: [],
    value: undefined
  }
}`,...f.parameters?.docs?.source}}}})))()}m();export{u as Default,d as Disabled,f as Empty,p as __namedExportsOrder,l as default};