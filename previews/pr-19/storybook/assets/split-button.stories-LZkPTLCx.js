import{n as e}from"./rolldown-runtime-sJBDdmOt.js";import{n as t,p as n}from"./iframe-BGSHCO9R.js";import{n as r,t as i}from"./src-Ceb_fqRb.js";function a(e){let[t,n]=(0,s.useState)(null);return(0,c.jsxs)(`div`,{children:[(0,c.jsx)(r,{...e,onAction:e=>n(e)}),(0,c.jsx)(`p`,{role:`status`,children:t?`Added ${t}`:`Choose a shape, then add it.`})]})}function o(e){let[t,n]=(0,s.useState)(e.options),[i,a]=(0,s.useState)(null);return(0,c.jsxs)(`div`,{children:[(0,c.jsx)(r,{...e,options:t,onAction:a}),(0,c.jsx)(`button`,{type:`button`,onClick:()=>n(e=>e.filter(e=>e.value!==`circle`)),children:`Remove Circle`}),(0,c.jsx)(`button`,{type:`button`,onClick:()=>n([]),children:`Clear options`}),(0,c.jsx)(`button`,{type:`button`,onClick:()=>n(e.options),children:`Restore options`}),(0,c.jsx)(`p`,{role:`status`,children:i?`Added ${i}`:`Choose a shape, then add it.`})]})}var s,c,l,u,d,f,p,m,h;function g(){return(g=e((()=>{s=n(),i(),c=t(),{useArgs:l}=__STORYBOOK_MODULE_PREVIEW_API__,u={id:`shared-splitbutton`,title:`Shared/Controls/SplitButton`,component:r,args:{actionLabel:`Add element`,menuLabel:`Choose shape`,value:`rect`,options:[{value:`rect`,label:`Rectangle`,icon:`Square`},{value:`circle`,label:`Circle`,icon:`Circle`},{value:`path`,label:`Path`,icon:`PenLine`}]},argTypes:{options:{control:!1},onAction:{control:!1},onValueChange:{control:!1},buttonProps:{control:!1}},render:function(e){let[,t]=l();return(0,c.jsx)(a,{...e,onValueChange:e=>t({value:e})})}},d={},f={args:{disabled:!0}},p={args:{options:[],value:void 0}},m={args:{value:void 0,defaultValue:`rect`},render:e=>(0,c.jsx)(o,{...e})},h=[`Default`,`Disabled`,`Empty`,`ChangingOptions`],d.parameters={...d.parameters,docs:{...d.parameters?.docs,source:{originalSource:`{}`,...d.parameters?.docs?.source}}},f.parameters={...f.parameters,docs:{...f.parameters?.docs,source:{originalSource:`{
  args: {
    disabled: true
  }
}`,...f.parameters?.docs?.source}}},p.parameters={...p.parameters,docs:{...p.parameters?.docs,source:{originalSource:`{
  args: {
    options: [],
    value: undefined
  }
}`,...p.parameters?.docs?.source}}},m.parameters={...m.parameters,docs:{...m.parameters?.docs,source:{originalSource:`{
  args: {
    value: undefined,
    defaultValue: "rect"
  },
  render: args => <ChangingOptionsExample {...args} />
}`,...m.parameters?.docs?.source}}}})))()}g();export{m as ChangingOptions,d as Default,f as Disabled,p as Empty,h as __namedExportsOrder,u as default};