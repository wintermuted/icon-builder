import{n as e}from"./rolldown-runtime-sJBDdmOt.js";import{n as t,p as n}from"./iframe-BGSHCO9R.js";import{O as r,t as i}from"./src-Ceb_fqRb.js";function a(e){let[t,n]=(0,o.useState)(``),i=t?t.trim().length<3?`Use at least three characters.`:void 0:e.error;return(0,s.jsx)(r,{...e,error:i,children:(0,s.jsx)(`input`,{className:`wm-input`,value:t,onChange:e=>{n(e.target.value)}})})}var o,s,c,l,u,d,f;function p(){return(p=e((()=>{o=n(),i(),s=t(),c={id:`shared-formfield`,title:`Shared/Controls/FormField`,component:r,args:{label:`Project name`,required:!0,hint:`Choose a short, recognizable name.`,children:(0,s.jsx)(`input`,{className:`wm-input`,defaultValue:`Geometric marks`})},argTypes:{label:{control:`text`},hint:{control:`text`},children:{control:!1}}},l={},u={args:{error:`Use at least three characters.`},render:e=>(0,s.jsx)(a,{...e})},d={args:{label:`Grid spacing`,inline:!0,required:!1,hint:void 0,children:(0,s.jsx)(`input`,{type:`number`,className:`wm-input`,defaultValue:8,min:1,style:{width:80}})}},f=[`WithHint`,`WithError`,`Inline`],l.parameters={...l.parameters,docs:{...l.parameters?.docs,source:{originalSource:`{}`,...l.parameters?.docs?.source}}},u.parameters={...u.parameters,docs:{...u.parameters?.docs,source:{originalSource:`{
  args: {
    error: "Use at least three characters."
  },
  render: args => <ValidatedField {...args} />
}`,...u.parameters?.docs?.source}}},d.parameters={...d.parameters,docs:{...d.parameters?.docs,source:{originalSource:`{
  args: {
    label: "Grid spacing",
    inline: true,
    required: false,
    hint: undefined,
    children: <input type="number" className="wm-input" defaultValue={8} min={1} style={{
      width: 80
    }} />
  }
}`,...d.parameters?.docs?.source}}}})))()}p();export{d as Inline,u as WithError,l as WithHint,f as __namedExportsOrder,c as default};