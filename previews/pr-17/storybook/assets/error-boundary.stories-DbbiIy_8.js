import{n as e}from"./rolldown-runtime-sJBDdmOt.js";import{n as t}from"./iframe-DQmNQi17.js";import{n,t as r}from"./src-VgYGgDmu.js";function i(){throw Error(`Example preview failure`)}var a,o,s,c,l;function u(){return(u=e((()=>{r(),a=t(),o={title:`Shared/PreviewBoundary`,component:n,args:{children:null},argTypes:{children:{control:!1}}},s={render:()=>(0,a.jsx)(n,{children:(0,a.jsx)(`p`,{children:`The preview rendered successfully.`})})},c={render:()=>(0,a.jsx)(n,{children:(0,a.jsx)(i,{})})},l=[`Healthy`,`Failed`],s.parameters={...s.parameters,docs:{...s.parameters?.docs,source:{originalSource:`{
  render: () => <PreviewBoundary>
      <p>The preview rendered successfully.</p>
    </PreviewBoundary>
}`,...s.parameters?.docs?.source}}},c.parameters={...c.parameters,docs:{...c.parameters?.docs,source:{originalSource:`{
  render: () => <PreviewBoundary>
      <FailedPreview />
    </PreviewBoundary>
}`,...c.parameters?.docs?.source}}}})))()}u();export{c as Failed,s as Healthy,l as __namedExportsOrder,o as default};