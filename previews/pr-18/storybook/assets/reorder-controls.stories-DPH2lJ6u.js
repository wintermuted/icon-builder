import{n as e}from"./rolldown-runtime-sJBDdmOt.js";import{n as t,p as n}from"./iframe-DY3mp-Om.js";import{c as r,t as i}from"./src-rjSk8eM7.js";function a(e){let[t,n]=(0,o.useState)([`Alpha`,`Beta`,`Gamma`]),i=(e,t)=>n(n=>{let r=[...n],i=r.splice(e,1)[0];return i!==void 0&&r.splice(e+t,0,i),r});return(0,s.jsx)(`ol`,{style:{display:`grid`,gap:`0.5rem`,paddingLeft:`1.5rem`},children:t.map((n,a)=>(0,s.jsx)(`li`,{children:(0,s.jsxs)(`span`,{style:{display:`inline-flex`,gap:`1rem`,alignItems:`center`},children:[(0,s.jsx)(`span`,{children:n}),(0,s.jsx)(r,{...e,label:n,upDisabled:a===0,downDisabled:a===t.length-1,onMoveUp:()=>i(a,-1),onMoveDown:()=>i(a,1)})]})},n))})}var o,s,c,l,u,d,f;function p(){return(p=e((()=>{o=n(),i(),s=t(),c={id:`shared-reordercontrols`,title:`Shared/Controls/ReorderControls`,component:r,args:{label:`item`},argTypes:{onMoveUp:{control:!1},onMoveDown:{control:!1}}},l={render:e=>(0,s.jsx)(a,{...e})},u={args:{label:`first item`,upDisabled:!0}},d={args:{disabled:!0}},f=[`Interactive`,`Boundary`,`Disabled`],l.parameters={...l.parameters,docs:{...l.parameters?.docs,source:{originalSource:`{
  render: args => <ReorderExample {...args} />
}`,...l.parameters?.docs?.source}}},u.parameters={...u.parameters,docs:{...u.parameters?.docs,source:{originalSource:`{
  args: {
    label: "first item",
    upDisabled: true
  }
}`,...u.parameters?.docs?.source}}},d.parameters={...d.parameters,docs:{...d.parameters?.docs,source:{originalSource:`{
  args: {
    disabled: true
  }
}`,...d.parameters?.docs?.source}}}})))()}p();export{u as Boundary,d as Disabled,l as Interactive,f as __namedExportsOrder,c as default};