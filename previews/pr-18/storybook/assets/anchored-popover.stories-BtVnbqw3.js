import{n as e}from"./rolldown-runtime-sJBDdmOt.js";import{n as t,p as n}from"./iframe-DY3mp-Om.js";import{i as r,t as i,u as a}from"./src-rjSk8eM7.js";function o({edge:e=!1,...t}){let n=(0,s.useRef)(null),i=(0,s.useId)();return(0,c.jsxs)(`div`,{style:e?{position:`fixed`,bottom:8,right:8}:void 0,children:[(0,c.jsx)(`button`,{className:`wm-button`,ref:n,popoverTarget:i,"aria-controls":i,"aria-expanded":`false`,children:`Open controls`}),(0,c.jsx)(r,{...t,id:i,anchorRef:n})]})}var s,c,l,u,d,f,p;function m(){return(m=e((()=>{s=n(),i(),c=t(),l={id:`shared-anchoredpopover`,title:`Shared/Overlays/AnchoredPopover`,component:r,args:{anchorRef:{current:null},"aria-label":`Preview controls`,children:(0,c.jsx)(a,{label:`Opacity`,min:0,max:1,step:.01,defaultValue:.5})},argTypes:{anchorRef:{control:!1},children:{control:!1},onOpenChange:{control:!1}},render:e=>(0,c.jsx)(o,{...e})},u={},d={parameters:{layout:`fullscreen`},render:e=>(0,c.jsx)(o,{...e,edge:!0})},f={args:{style:{width:360},children:(0,c.jsxs)(`div`,{children:[(0,c.jsx)(`h3`,{children:`Preview controls`}),Array.from({length:20},(e,t)=>(0,c.jsxs)(`p`,{children:[`Additional setting `,t+1,`: scrollable content stays within the available viewport.`]},t))]})}},p=[`Default`,`ViewportEdge`,`LongContent`],u.parameters={...u.parameters,docs:{...u.parameters?.docs,source:{originalSource:`{}`,...u.parameters?.docs?.source}}},d.parameters={...d.parameters,docs:{...d.parameters?.docs,source:{originalSource:`{
  parameters: {
    layout: "fullscreen"
  },
  render: args => <PopoverExample {...args} edge />
}`,...d.parameters?.docs?.source}}},f.parameters={...f.parameters,docs:{...f.parameters?.docs,source:{originalSource:`{
  args: {
    style: {
      width: 360
    },
    children: <div>
        <h3>Preview controls</h3>
        {Array.from({
        length: 20
      }, (_, index) => <p key={index}>
            Additional setting {index + 1}: scrollable content stays within the available viewport.
          </p>)}
      </div>
  }
}`,...f.parameters?.docs?.source}}}})))()}m();export{u as Default,f as LongContent,d as ViewportEdge,p as __namedExportsOrder,l as default};