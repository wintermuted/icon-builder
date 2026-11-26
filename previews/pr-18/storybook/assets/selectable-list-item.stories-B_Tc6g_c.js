import{n as e}from"./rolldown-runtime-sJBDdmOt.js";import{n as t,p as n}from"./iframe-9GxATJBz.js";import{o as r,t as i}from"./src-DsyK_ZYA.js";function a(e){let[t,n]=(0,o.useState)(`Rectangle`),[i,a]=(0,o.useState)(null),[c,l]=(0,o.useState)(new Set);return(0,s.jsx)(`ul`,{"aria-label":`Shapes`,style:{display:`grid`,gap:`0.35rem`,listStyle:`none`,padding:0,width:320,maxWidth:`100%`},children:[`Rectangle`,`Circle`].map(u=>(0,o.createElement)(r,{...e,key:u,selected:e.selected||t===u,active:i===u,marked:c.has(u),onMouseEnter:()=>a(u),onMouseLeave:()=>a(null)},(0,s.jsx)(`input`,{type:`checkbox`,"aria-label":`Mark ${u}`,checked:c.has(u),onChange:e=>{let t=e.target.checked;l(e=>{let n=new Set(e);return t?n.add(u):n.delete(u),n})}}),(0,s.jsx)(`button`,{className:`wm-button wm-button--ghost`,"aria-pressed":t===u,onClick:()=>n(u),children:u}),(0,s.jsx)(`code`,{children:u===`Rectangle`?`rect`:`circle`})))})}var o,s,c,l,u,d,f;function p(){return(p=e((()=>{o=n(),i(),s=t(),c={id:`shared-selectablelistitem`,title:`Shared/Display/SelectableListItem`,component:r,render:e=>(0,s.jsx)(a,{...e})},l={},u={args:{selected:!0}},d={args:{draggable:!0,dropTarget:!0}},f=[`Interactive`,`Selected`,`DragTarget`],l.parameters={...l.parameters,docs:{...l.parameters?.docs,source:{originalSource:`{}`,...l.parameters?.docs?.source}}},u.parameters={...u.parameters,docs:{...u.parameters?.docs,source:{originalSource:`{
  args: {
    selected: true
  }
}`,...u.parameters?.docs?.source}}},d.parameters={...d.parameters,docs:{...d.parameters?.docs,source:{originalSource:`{
  args: {
    draggable: true,
    dropTarget: true
  }
}`,...d.parameters?.docs?.source}}}})))()}p();export{d as DragTarget,l as Interactive,u as Selected,f as __namedExportsOrder,c as default};